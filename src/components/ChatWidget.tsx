import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { cn } from '@/lib/utils';

type Message = {
  sender: 'user' | 'bot';
  text: string;
};

interface ChatResponse {
  reply: string;
  step: string;
  finished: boolean;
  sessionId: string;
}

export const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>(() => {
    return localStorage.getItem('chat_sessionId') || undefined;
  });
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('chat_messages');
    return saved ? JSON.parse(saved) : [];
  });
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasStarted, setHasStarted] = useState(() => {
    return !!localStorage.getItem('chat_messages');
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const toggleChat = () => setIsOpen(!isOpen);

  useEffect(() => {
    if (sessionId) {
      localStorage.setItem('chat_sessionId', sessionId);
    } else {
      localStorage.removeItem('chat_sessionId');
    }
  }, [sessionId]);

  useEffect(() => {
    localStorage.setItem('chat_messages', JSON.stringify(messages));
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  useEffect(() => {
    if (isOpen && !hasStarted && messages.length === 0) {
      handleSendMessage('start', true);
      setHasStarted(true);
    }
  }, [isOpen, hasStarted, messages.length]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleSendMessage = async (text: string, isHiddenStart = false) => {
    if (!text.trim()) return;

    if (!isHiddenStart) {
      setMessages((prev) => [...prev, { sender: 'user', text }]);
      setInputMessage('');
    }
    
    setIsLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          message: text,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao comunicar com o servidor');
      }

      const data: ChatResponse = await response.json();

      if (data.finished) {
        setSessionId(undefined);
      } else if (data.sessionId) {
        setSessionId(data.sessionId);
      }

      setMessages((prev) => [...prev, { sender: 'bot', text: data.reply }]);
    } catch (error) {
      console.error('Erro no chat:', error);
      setMessages((prev) => [
        ...prev,
        { sender: 'bot', text: 'Desculpe, ocorreu um erro. Tente novamente mais tarde.' },
      ]);
    } finally {
      setIsLoading(false);
      // Mantém o foco no input após enviar, mesmo se estava disabled
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage(inputMessage);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {isOpen && (
        <Card className="w-[350px] h-[500px] flex flex-col shadow-xl border-primary/20 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <CardHeader className="bg-primary text-primary-foreground p-4 rounded-t-lg flex flex-row justify-between items-center space-y-0">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <CardTitle className="text-base font-medium">Vik</CardTitle>
              </div>
              <span className="text-xs text-primary-foreground/80 ml-4">Consultora de Embalagens</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground"
              onClick={toggleChat}
            >
              <X className="h-5 w-5" />
            </Button>
          </CardHeader>
          
          <CardContent className="flex-1 p-0 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-900">
            <ScrollArea className="flex-1 p-4">
              <div className="flex flex-col gap-3 min-h-full justify-end">
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm",
                      msg.sender === 'user'
                        ? "bg-primary text-primary-foreground self-end rounded-br-none"
                        : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 self-start rounded-bl-none border border-slate-200 dark:border-slate-700"
                    )}
                  >
                    {msg.text.split('\n').map((line, i) => (
                      <React.Fragment key={i}>
                        {line}
                        {i < msg.text.split('\n').length - 1 && <br />}
                      </React.Fragment>
                    ))}
                  </div>
                ))}
                {isLoading && (
                  <div className="bg-white dark:bg-slate-800 self-start rounded-2xl rounded-bl-none px-4 py-2 border border-slate-200 dark:border-slate-700">
                    <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                  </div>
                )}
                <div ref={scrollRef} />
              </div>
            </ScrollArea>
            
            <div className="p-3 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex gap-2">
              <Input
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Digite sua mensagem..."
                className="flex-1 focus-visible:ring-1"
                disabled={isLoading}
              />
              <Button 
                onClick={() => handleSendMessage(inputMessage)} 
                size="icon"
                disabled={!inputMessage.trim() || isLoading}
                className="shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Button
        onClick={toggleChat}
        size="lg"
        className={cn(
          "h-14 w-14 rounded-full shadow-lg transition-all duration-300 hover:scale-110",
          isOpen ? "bg-red-500 hover:bg-red-600 rotate-90 scale-0 opacity-0 hidden" : "scale-100 opacity-100"
        )}
      >
        <MessageCircle className="h-8 w-8" />
      </Button>
    </div>
  );
};
