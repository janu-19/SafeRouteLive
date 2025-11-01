import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, ArrowLeft, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AIChatbot() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello! I\'m your SafeRoute AI assistant. I can help you with route planning, safety tips, and answer questions about your journey. How can I help you today?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    
    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      // Get Gemini API key from environment variable
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      
      if (!apiKey) {
        throw new Error('Gemini API key not found. Please add VITE_GEMINI_API_KEY to your .env file');
      }

      // Build conversation history for context
      const conversationHistory = messages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

      // Add system context and user message
      const systemContext = `You are an AI assistant for SafeRoute Live, an intelligent safety-focused navigation application.

**About SafeRoute Live:**
SafeRoute Live is a comprehensive safety navigation platform that helps users travel safely by providing:

1. **Smart Route Planning**: 
   - Calculates multiple route options with safety scores
   - Considers crime data, accident history, lighting conditions, and crowd density
   - Provides real-time safety insights for each route
   - Shows distance, estimated time, and detailed safety metrics

2. **Key Features**:
   - **SOS Emergency Alert**: One-tap emergency button that sends alerts with location to emergency contacts
   - **Live Location Sharing**: Share real-time location with friends/family for safety
   - **AI Chatbot**: Intelligent assistant (that's you!) for route advice and safety tips
   - **Safety Dashboard**: View crime hotspots, accident-prone areas, and safety statistics
   - **Real-time Updates**: Get alerts about safety concerns along your route
   - **Theme Customization**: 5 beautiful themes (Ocean, Sunset, Forest, Midnight, Coral)

3. **Safety Factors We Consider**:
   - Crime rate data in different areas
   - Historical accident data
   - Street lighting conditions (well-lit vs poorly-lit areas)
   - Crowd density (higher crowds = safer)
   - Traffic conditions
   - Time of day considerations

4. **How to Use SafeRoute Live**:
   - Enter source and destination in Route Planner
   - Choose preference: Well-lit, Crowded, or Shortest route
   - Review multiple route options with safety scores
   - Select the safest route for your journey
   - Get turn-by-turn navigation with safety alerts
   - Use SOS button in emergencies
   - Share live location with trusted contacts

5. **Safety Tips You Can Provide**:
   - Prefer well-lit routes at night
   - Choose routes through crowded areas when possible
   - Avoid areas with high crime rates
   - Share your location when traveling alone
   - Keep the SOS button accessible
   - Check safety scores before starting journey
   - Stay alert and aware of surroundings
   - Travel during daylight hours when possible
   - Inform someone about your route and ETA

**Your Role:**
- Answer questions about SafeRoute Live features
- Provide personalized safety advice for routes
- Explain how to use different features
- Give travel safety tips
- Help users understand safety scores
- Suggest safer alternatives when asked
- Be friendly, helpful, and safety-conscious

Always prioritize user safety in your responses and encourage them to use SafeRoute Live's safety features.`;

      conversationHistory.push({
        role: 'user',
        parts: [{ text: `${systemContext}\n\nUser question: ${userMessage}` }]
      });

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: conversationHistory
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Gemini API Error:', errorData);
        throw new Error(`Gemini API Error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const aiResponse = data.candidates[0]?.content?.parts[0]?.text || 'Sorry, I couldn\'t generate a response.';

      // Add AI response
      setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Error: ${error.message}. Please make sure you have set up your Gemini API key in the .env file.` 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 dark:from-slate-900 dark:via-slate-950 dark:to-black">
      {/* Header */}
      <div className="glass border-b border-slate-200/50 dark:border-slate-700/50 p-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link 
            to="/" 
            className="p-2 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Bot size={20} className="text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-slate-900 dark:text-white">AI Assistant</h1>
              <p className="text-xs text-slate-600 dark:text-slate-400">Powered by Google Gemini</p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                message.role === 'user' 
                  ? 'bg-gradient-to-br from-primary to-secondary' 
                  : 'bg-slate-300 dark:bg-slate-700'
              }`}>
                {message.role === 'user' ? (
                  <User size={16} className="text-white" />
                ) : (
                  <Bot size={16} className="text-slate-700 dark:text-slate-300" />
                )}
              </div>
              <div className={`flex-1 max-w-2xl ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                <div className={`inline-block px-4 py-3 rounded-2xl ${
                  message.role === 'user'
                    ? 'bg-gradient-to-br from-primary to-secondary text-white'
                    : 'glass text-slate-900 dark:text-white'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                <Bot size={16} className="text-slate-700 dark:text-slate-300" />
              </div>
              <div className="glass px-4 py-3 rounded-2xl">
                <Loader2 size={16} className="animate-spin text-slate-600 dark:text-slate-400" />
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="glass border-t border-slate-200/50 dark:border-slate-700/50 p-4">
        <div className="max-w-4xl mx-auto flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything about your route or safety..."
            className="flex-1 px-4 py-3 rounded-xl bg-slate-200/60 dark:bg-slate-800/60 border border-slate-300/50 dark:border-slate-700/50 outline-none focus:border-primary transition-colors text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400"
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="btn-primary px-6 py-3 rounded-xl text-white font-semibold hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Send size={18} />
          </button>
        </div>
        <p className="text-xs text-center text-slate-500 dark:text-slate-400 mt-2">
          Make sure to add your VITE_GEMINI_API_KEY to the .env file
        </p>
      </div>
    </div>
  );
}
