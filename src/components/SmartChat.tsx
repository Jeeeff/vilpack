
import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Loader2, Store } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
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

import { API_URL } from '@/config/api';

// Generate UUID v4
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

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
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Scroll para o fim sempre que messages ou isTyping mudar
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' });
  };

  // Load session and history from backend on mount
  useEffect(() => {
    const initChat = async () => {
      const savedSessionId = localStorage.getItem('vilpack_session_id');
      if (savedSessionId) {
        setSessionId(savedSessionId);
        try {
          const res = await fetch(`${API_URL}/ai/history/${savedSessionId}`);
          if (res.ok) {
            const history = await res.json();
            const formattedHistory = history.map((msg: any) => ({
              id: msg.id,
              sender: msg.role === 'assistant' ? 'assistant' : 'user',
              text: msg.content,
              timestamp: new Date(msg.createdAt),
              isOrderSummary: msg.content.includes('### [RESUMO_FINAL]'),
              summaryContent: msg.content.includes('### [RESUMO_FINAL]') ? msg.content : undefined
            }));
            setMessages(formattedHistory);
          } else if (res.status === 404) {
            localStorage.removeItem('vilpack_session_id');
            setSessionId(null);
          }
        } catch (error) {
          console.error("Erro ao carregar histórico:", error);
        }
      }
    };
    initChat();
  }, []);

  // Auto-scroll to bottom quando chegam mensagens ou typing indicator muda
  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Scroll imediato (sem animação) ao abrir o chat com histórico
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => scrollToBottom('instant'), 50);
    }
  }, [isOpen]);

  // Focus input when open
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current.focus(), 100);
    }
  }, [isOpen]);

  // Get or create session ID (local UUID generation)
  const getOrCreateSessionId = (): string => {
    const saved = localStorage.getItem('vilpack_session_id');
    if (saved) return saved;
    
    const newSessionId = generateUUID();
    localStorage.setItem('vilpack_session_id', newSessionId);
    console.log(`[SmartChat] New session created: ${newSessionId}`);
    return newSessionId;
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
    setIsTyping(true);

    try {
      // Get or create session ID locally (no API call)
      let currentSessionId = sessionId || getOrCreateSessionId();
      setSessionId(currentSessionId);

      const res = await fetch(`${API_URL}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: currentSessionId,
          message: userMsg.text,
        }),
      });

      if (!res.ok) {
        throw new Error(`Chat error: ${res.status}`);
      }

      const data = await res.json();
      addAssistantMessage(data.reply);
    } catch (error) {
      console.error('Chat error:', error);
      toast({
        title: "Erro no chat",
        description: "Não foi possível enviar sua mensagem. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsTyping(false);
      // Mantém o foco no input após enviar
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  };

  const addAssistantMessage = (text: string) => {
    const isOrderSummary = text.includes('### [RESUMO_FINAL]');
    const assistantMsg: Message = {
      id: (Date.now() + 1).toString(),
      sender: 'assistant',
      text: text,
      timestamp: new Date(),
      isOrderSummary,
      summaryContent: isOrderSummary ? text : undefined,
    };
    setMessages((prev) => [...prev, assistantMsg]);
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
          className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-2xl z-50 bg-primary hover:bg-primary/90 text-white transition-all duration-500 hover:scale-110 active:scale-95 animate-bounce-slow flex flex-col items-center justify-center gap-0.5 border-2 border-white/20"
          size="icon"
        >
          <MessageCircle className="h-7 w-7" />
          <span className="text-[10px] font-bold uppercase tracking-tighter">Vick</span>
        </Button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <Card className="fixed bottom-4 right-4 md:bottom-6 md:right-6 w-[calc(100vw-32px)] md:w-[420px] h-[85vh] md:h-[650px] max-h-[90vh] shadow-[-20px_20px_60px_rgba(0,0,0,0.15)] z-50 flex flex-col border-none overflow-hidden rounded-3xl animate-in slide-in-from-bottom-10 fade-in duration-500">
          <CardHeader className="bg-primary text-primary-foreground p-5 flex flex-row items-center justify-between shrink-0 shadow-lg relative z-10">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="bg-white/20 p-2.5 rounded-2xl backdrop-blur-sm border border-white/10">
                  <Store className="h-6 w-6 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-500 border-2 border-primary rounded-full"></div>
              </div>
              <div>
                <CardTitle className="text-xl font-bold tracking-tight">Consultoria Vick</CardTitle>
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 bg-green-400 rounded-full animate-pulse"></div>
                  <p className="text-xs text-primary-foreground/70 font-medium">Online e pronta para ajudar</p>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
            >
              <X className="h-6 w-6" />
            </Button>
          </CardHeader>

          <CardContent className="flex-1 overflow-hidden p-0 bg-slate-50/50 relative">
            <div ref={scrollContainerRef} className="h-full w-full overflow-y-auto">
              <div className="p-4 space-y-6">
                {/* Welcome Message if no history */}
                {messages.length === 0 && !isLoading && (
                   <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
                      <div className="bg-primary/10 p-4 rounded-full">
                        <MessageCircle className="h-8 w-8 text-primary" />
                      </div>
                      <div className="space-y-1">
                         <p className="font-bold text-slate-800">Olá! Sou a Vick.</p>
                        <p className="text-sm text-slate-500 max-w-[200px]">Especialista em embalagens Vilpack. Como posso ajudar seu negócio hoje?</p>
                      </div>
                   </div>
                )}
                
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex w-full animate-in fade-in slide-in-from-bottom-2 duration-300",
                      msg.sender === 'user' ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm transition-all",
                        msg.sender === 'user'
                          ? "bg-primary text-primary-foreground rounded-br-none"
                          : "bg-white border border-slate-100 text-slate-800 rounded-bl-none"
                      )}
                    >
                      <div className="whitespace-pre-wrap leading-relaxed">
                        {/* Markdown parsing logic remains the same but UI updated */}
                        {msg.text.split(/(!\[.*?\]\(.*?\))|(\*\*.*?\*\*)/g).filter(Boolean).map((part, i) => {
                            if (part.startsWith('![') && part.includes('](') && part.endsWith(')')) {
                                const altEndIndex = part.indexOf('](');
                                const alt = part.substring(2, altEndIndex);
                                const url = part.substring(altEndIndex + 2, part.length - 1);
                                return (
                                  <div key={i} className="my-3 rounded-xl overflow-hidden border border-slate-100 shadow-md bg-white group cursor-pointer transition-transform hover:scale-[1.02]">
                                    <img src={url} alt={alt} className="w-full h-auto object-cover max-h-48" />
                                    <div className="p-2 bg-slate-50 text-[10px] text-slate-400 italic text-center border-t border-slate-100">
                                        {alt}
                                    </div>
                                  </div>
                                );
                            }
                            if (part.startsWith('**') && part.endsWith('**')) {
                                return <strong key={i} className="font-bold text-primary">{part.slice(2, -2)}</strong>;
                            }
                            return part;
                        })}
                        
                        {msg.isOrderSummary && (
                          <div className="mt-4 p-4 bg-slate-50 rounded-xl border-2 border-dashed border-primary/20 space-y-4">
                              <div className="flex items-center gap-2 text-primary font-bold">
                                 <Store className="h-4 w-4" />
                                 <span>Proposta Vilpack</span>
                              </div>
                              <Button 
                                  className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-bold py-7 text-base shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-95 flex flex-col items-center justify-center gap-0 leading-tight rounded-xl"
                                  onClick={() => {
                                      const VILPACK_PHONE = "5511996113977";
                                      const content = msg.summaryContent || '';

                                      // Extrai campos do bloco [RESUMO_FINAL] gerado pela Vick
                                      const extractField = (label: string) => {
                                        const regex = new RegExp(`\\*\\*${label}:\\*\\*\\s*(.+)`, 'i');
                                        const match = content.match(regex);
                                        return match ? match[1].trim() : null;
                                      };

                                      const clienteName  = extractField('Cliente')   || extractField('Nome');
                                      const clienteWA    = extractField('WhatsApp')  || extractField('Telefone');
                                      const segmento     = extractField('Segmento');
                                      const interesse    = extractField('Interesse') || extractField('Produtos');

                                      // Monta mensagem para o WhatsApp da Vilpack
                                      const linhas: string[] = [
                                        '🔔 *Novo lead via chat Vick*',
                                        '',
                                        clienteName  ? `👤 *Cliente:* ${clienteName}`   : null,
                                        clienteWA    ? `📱 *WhatsApp:* ${clienteWA}`     : null,
                                        segmento     ? `🏢 *Segmento:* ${segmento}`      : null,
                                        interesse    ? `🎯 *Interesse:* ${interesse}`     : null,
                                        '',
                                        '---',
                                        '_Resumo da conversa com a Vick:_',
                                        content
                                          .replace(/###\s*\[RESUMO_FINAL\]\s*/gi, '')
                                          .trim(),
                                      ].filter((l): l is string => l !== null);

                                      const text = encodeURIComponent(linhas.join('\n'));
                                      window.open(`https://wa.me/${VILPACK_PHONE}?text=${text}`, '_blank');
                                  }}
                              >
                                  <div className="flex items-center gap-2">
                                    <MessageCircle className="h-5 w-5 fill-current" />
                                    <span>Finalizar no WhatsApp</span>
                                  </div>
                                  <span className="text-[10px] opacity-80 font-normal">Falar com consultor humano</span>
                              </Button>
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] opacity-50 mt-2 block text-right font-medium">
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
                
                {isTyping && (
                  <div className="flex justify-start animate-in fade-in duration-300">
                    <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm flex items-center gap-2">
                      <div className="flex gap-1">
                        <div className="h-1.5 w-1.5 bg-primary/40 rounded-full animate-bounce"></div>
                        <div className="h-1.5 w-1.5 bg-primary/60 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                        <div className="h-1.5 w-1.5 bg-primary/80 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                      </div>
                      <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Vick digitando</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>
          </CardContent>

          <CardFooter className="p-4 bg-white border-t border-slate-100 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
            <div className="flex w-full gap-2 items-end">
              <div className="flex-1 bg-slate-50 rounded-2xl border border-slate-200 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all overflow-hidden">
                <Input
                  ref={inputRef}
                  placeholder="Descreva o que sua marca precisa..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="border-none focus-visible:ring-0 bg-transparent py-6 h-auto text-sm"
                  disabled={isLoading}
                />
              </div>
              <Button 
                onClick={handleSendMessage} 
                disabled={isLoading || !inputValue.trim()}
                className="h-12 w-12 rounded-xl shadow-md transition-all active:scale-90 shrink-0"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
          </CardFooter>
        </Card>
      )}
    </>
  );
};
