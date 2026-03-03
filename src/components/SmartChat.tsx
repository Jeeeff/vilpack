
import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Loader2, Store } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from './ui/card';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";

type Message = {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  isOrderSummary?: boolean;
  summaryContent?: string;
};

const STORE_SLUG = 'loja-demo';
const API_URL = 'http://localhost:3001/api';

interface SmartChatProps {
  onSessionChange?: (sessionId: string) => void;
}

export const SmartChat = ({ onSessionChange }: SmartChatProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  // Notify parent when sessionId changes
  useEffect(() => {
    if (sessionId && onSessionChange) {
      onSessionChange(sessionId);
    }
  }, [sessionId, onSessionChange]);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Load session from localStorage on mount
  useEffect(() => {
    const savedSessionId = localStorage.getItem('vilpack_session_id');
    if (savedSessionId) {
      setSessionId(savedSessionId);
      // Optional: Fetch history if backend supports it
    }
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Focus input when open
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current.focus(), 100);
    }
  }, [isOpen]);

  const createSession = async () => {
    try {
      const res = await fetch(`${API_URL}/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeSlug: STORE_SLUG }),
      });
      
      if (!res.ok) throw new Error('Falha ao criar sessão');
      
      const data = await res.json();
      setSessionId(data.sessionId);
      localStorage.setItem('vilpack_session_id', data.sessionId);
      return data.sessionId;
    } catch (error) {
      console.error('Erro ao criar sessão:', error);
      toast({
        variant: "destructive",
        title: "Erro de Conexão",
        description: "Não foi possível conectar ao servidor.",
      });
      return null;
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      let currentSessionId = sessionId;
      if (!currentSessionId) {
        currentSessionId = await createSession();
        if (!currentSessionId) {
            setIsLoading(false);
            return;
        }
      }

      const res = await fetch(`${API_URL}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: currentSessionId,
          message: userMsg.text,
        }),
      });

      if (!res.ok) {
          if (res.status === 404 || res.status === 400) {
              // Session might be expired or invalid, try recreating
              localStorage.removeItem('vilpack_session_id');
              setSessionId(null);
              // Retry once
              currentSessionId = await createSession();
              if (currentSessionId) {
                   const retryRes = await fetch(`${API_URL}/ai/chat`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          sessionId: currentSessionId,
                          message: userMsg.text,
                        }),
                   });
                   if (retryRes.ok) {
                       const data = await retryRes.json();
                       addAssistantMessage(data.reply, currentSessionId);
                       setIsLoading(false);
                       return;
                   }
              }
          }
          throw new Error('Erro na resposta da IA');
      }

      const data = await res.json();
      addAssistantMessage(data.reply, currentSessionId);

    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      addAssistantMessage("Desculpe, tive um problema técnico. Pode tentar novamente?", sessionId || '');
    } finally {
      setIsLoading(false);
    }
  };

  const saveDraftOrder = async (summary: string, sid: string) => {
    try {
      if (!sid) return;
      
      await fetch(`${API_URL}/order/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sid,
          orderSummary: summary,
        }),
      });
    } catch (error) {
      console.error('Erro ao salvar rascunho:', error);
    }
  };

  const addAssistantMessage = (text: string, sid: string) => {
    let cleanText = text;
    let isOrderSummary = false;
    let summaryContent = '';

    if (text.includes('### [RESUMO_FINAL]')) {
      const parts = text.split('### [RESUMO_FINAL]');
      cleanText = parts[0].trim();
      summaryContent = parts[1] ? parts[1].trim() : '';
      isOrderSummary = true;
      
      saveDraftOrder(summaryContent, sid);
    }

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        sender: 'assistant',
        text: cleanText,
        timestamp: new Date(),
        isOrderSummary,
        summaryContent,
      },
    ]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 animate-bounce-slow"
          size="icon"
        >
          <MessageCircle className="h-8 w-8" />
        </Button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <Card className="fixed bottom-20 right-4 w-[90vw] md:w-[450px] h-[600px] max-h-[80vh] shadow-2xl z-50 flex flex-col border-primary/20 animate-in slide-in-from-bottom-10 fade-in duration-300">
          <CardHeader className="bg-primary text-primary-foreground p-4 rounded-t-lg flex flex-row items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-full">
                <Store className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">Vilpack Assistant</CardTitle>
                <p className="text-xs text-primary-foreground/80">Consultor de Embalagens</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-white/20"
            >
              <X className="h-6 w-6" />
            </Button>
          </CardHeader>

          <CardContent className="flex-1 p-0 overflow-hidden bg-slate-50 relative">
            <ScrollArea className="h-full p-4">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground mt-20 space-y-4 opacity-70">
                  <Store className="h-16 w-16 text-primary/20" />
                  <p>Olá! Sou o assistente virtual da Vilpack.</p>
                  <p>Posso te ajudar a encontrar as melhores embalagens para o seu negócio.</p>
                </div>
              )}
              
              <div className="space-y-4 pb-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex w-full",
                      msg.sender === 'user' ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm",
                        msg.sender === 'user'
                          ? "bg-primary text-primary-foreground rounded-br-none"
                          : "bg-white border border-slate-200 text-slate-800 rounded-bl-none"
                      )}
                    >
                      <div className="whitespace-pre-wrap leading-relaxed">
                        {/* Markdown parsing for bold and images */}
                        {msg.text.split(/(!\[.*?\]\(.*?\))|(\*\*.*?\*\*)/g).filter(Boolean).map((part, i) => {
                            if (part.startsWith('![') && part.includes('](') && part.endsWith(')')) {
                                // Image handling: ![alt](url)
                                const altEndIndex = part.indexOf('](');
                                const alt = part.substring(2, altEndIndex);
                                const url = part.substring(altEndIndex + 2, part.length - 1);
                                return (
                                  <div key={i} className="my-2 rounded-lg overflow-hidden border border-slate-200 shadow-sm bg-white">
                                    <img 
                                      src={url} 
                                      alt={alt} 
                                      className="w-full h-auto object-cover max-h-[200px]" 
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                        (e.target as HTMLImageElement).parentElement!.style.display = 'none';
                                      }}
                                    />
                                    {alt && <div className="bg-slate-50 px-2 py-1 text-[10px] text-muted-foreground text-center border-t border-slate-100">{alt}</div>}
                                  </div>
                                );
                            }
                            if (part.startsWith('**') && part.endsWith('**')) {
                                return <strong key={i}>{part.slice(2, -2)}</strong>;
                            }
                            return <span key={i}>{part}</span>;
                        })}
                        {msg.isOrderSummary && (
                          <div className="mt-4 pt-4 border-t border-slate-200">
                              <div className="bg-slate-50 p-3 rounded-md text-xs text-slate-600 mb-3 font-mono whitespace-pre-wrap border border-slate-200">
                                  {msg.summaryContent}
                              </div>
                              <Button 
                                  className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-bold py-6 text-base shadow-md transition-all duration-300 hover:shadow-lg flex items-center justify-center gap-2"
                                  onClick={() => {
                                      const phone = "5511999999999"; 
                                      const text = encodeURIComponent(msg.summaryContent || '');
                                      window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
                                  }}
                              >
                                  <MessageCircle className="h-5 w-5 fill-current" />
                                  Enviar Pedido via WhatsApp
                              </Button>
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] opacity-70 mt-1 block text-right">
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span className="text-xs text-muted-foreground">Digitando...</span>
                    </div>
                  </div>
                )}
                <div ref={scrollRef} />
              </div>
            </ScrollArea>
          </CardContent>

          <CardFooter className="p-3 bg-white border-t">
            <div className="flex w-full gap-2">
              <Input
                ref={inputRef}
                placeholder="Digite sua dúvida..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1"
                disabled={isLoading}
              />
              <Button 
                onClick={handleSendMessage} 
                disabled={isLoading || !inputValue.trim()}
                size="icon"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </CardFooter>
        </Card>
      )}
    </>
  );
};
