// src/components/AiChatbot.jsx
import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot } from 'lucide-react';
import { analyzeCounselor } from '../utils/aiManager';

const AiChatbot = ({ data }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'bot', text: '안녕하세요! AI 총괄 매니저입니다.\n다음 명령어로 정밀 진단을 도와드려요.\n\n1️⃣ **상담사 분석**: 이름 입력 (예: "미듬")\n2️⃣ **현황 요약**: "전체 현황"\n3️⃣ **정밀 진단**: "문제 상담사", "관리 필요"' }
    ]);
    const [input, setInput] = useState('');
    const scrollRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages, isOpen]);

    const handleSend = () => {
        if (!input.trim()) return;
        
        const userMsg = { role: 'user', text: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');

        setTimeout(() => {
            let responseText = '';
            const keyword = userMsg.text.trim();
            
            // --- 1. 전체 현황 요약 ---
            if (keyword.includes('전체') || keyword.includes('요약')) {
                const totalRev = data.reduce((acc, cur) => acc + (cur.curRev || 0), 0);
                const activeCount = data.filter(d => d.status !== 'blind').length;
                const avgRev = activeCount > 0 ? Math.floor(totalRev / activeCount) : 0;
                
                responseText = `📊 **전체 운영 현황 요약**\n\n` +
                               `- **총 매출**: ${(totalRev/10000).toLocaleString()}만원\n` +
                               `- **활성 상담사**: ${activeCount}명\n` +
                               `- **1인당 평균 매출**: ${(avgRev/10000).toLocaleString()}만원`;
            }
            // --- 2. 카테고리별 분석 ---
            else if (['타로', '신점', '사주'].some(cat => keyword.includes(cat))) {
                const category = keyword.includes('타로') ? '타로' : keyword.includes('신점') ? '신점' : '사주';
                const catData = data.filter(d => d.category && d.category.includes(category));
                const totalRev = catData.reduce((acc, cur) => acc + (cur.curRev || 0), 0);
                
                responseText = `🔮 **${category} 분야 현황**\n\n` +
                               `- **상담사 수**: ${catData.length}명\n` +
                               `- **총 매출**: ${(totalRev/10000).toLocaleString()}만원`;
            }
            // --- 3. [핵심] 문제 상담사 정밀 진단 (고도화됨) ---
            else if (keyword.includes('문제') || keyword.includes('관리') || keyword.includes('리스크')) {
                const riskList = [];

                data.forEach(d => {
                    if (d.status === 'blind') return; // 블라인드 제외

                    const hours = d.curTime / 3600;
                    const prevHours = (d.prevTime || 0) / 3600;
                    const timeDrop = prevHours - hours; // 시간 감소량
                    
                    // [1] 유령 상담사 (아예 접속 0)
                    if (d.curTime === 0) {
                        riskList.push({ ...d, riskType: '👻미접속', score: 100, reason: '이번 주 접속 기록 없음' });
                    }
                    // [2] 활동 급감 (지난주 대비 10시간 이상 감소)
                    else if (timeDrop >= 10) {
                        riskList.push({ ...d, riskType: '📉활동급감', score: 80, reason: `지난주 대비 ${timeDrop.toFixed(0)}시간 감소` });
                    }
                    // [3] 효율 저하 (30시간 이상 접속했으나 매출 30만 원 미만 - 시급 1만 원 꼴 이하)
                    else if (hours >= 30 && d.curRev < 300000) {
                        riskList.push({ ...d, riskType: '🐢효율저하', score: 60, reason: `접속 ${hours.toFixed(0)}h / 매출 ${(d.curRev/10000).toFixed(0)}만` });
                    }
                    // [4] 부재중 과다
                    else if (d.curMissed >= 5) {
                        riskList.push({ ...d, riskType: '📞부재과다', score: 50, reason: `부재중 ${d.curMissed}건` });
                    }
                });

                // 우선순위 정렬 (score 높은 순)
                const topRisks = riskList.sort((a,b) => b.score - a.score).slice(0, 5);
                
                if (topRisks.length === 0) {
                    responseText = "🎉 현재 특이사항이 있는 상담사가 없습니다. 운영이 매우 안정적입니다!";
                } else {
                    const listStr = topRisks.map(d => `- **[${d.riskType}] ${d.nick}**: ${d.reason}`).join('\n');
                    responseText = `🚨 **집중 관리 대상 TOP 5**\n(우선순위: 미접속 > 급감 > 효율 > 부재)\n\n${listStr}\n\n상세 피드백이 필요하면 이름을 입력해주세요.`;
                }
            }
            // --- 4. 개별 상담사 분석 ---
            else {
                const target = data.find(d => d.nick.includes(keyword) || (d.realName && d.realName.includes(keyword)));
                if (target) {
                    responseText = analyzeCounselor(target);
                } else {
                    responseText = `죄송해요, "${keyword}"에 대한 정보를 찾지 못했습니다.`;
                }
            }

            setMessages(prev => [...prev, { role: 'bot', text: responseText }]);
        }, 500);
    };

    const handleKeyDown = (e) => { if (e.key === 'Enter') handleSend(); };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end font-sans">
            {isOpen && (
                <div className="bg-white dark:bg-gray-800 w-80 h-[32rem] rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 flex flex-col mb-4 overflow-hidden animate-fade-in-up">
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 text-white flex justify-between items-center shadow-md">
                        <div className="flex items-center gap-2 font-bold text-sm">
                            <Bot size={18} className="text-indigo-200"/> AI 총괄 매니저
                        </div>
                        <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 rounded-full p-1 transition"><X size={16}/></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900 scrollbar-thin scrollbar-thumb-gray-300" ref={scrollRef}>
                        {messages.map((m, i) => (
                            <div key={i} className={`flex mb-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed shadow-sm ${
                                    m.role === 'user' 
                                    ? 'bg-indigo-600 text-white rounded-tr-none' 
                                    : 'bg-white dark:bg-gray-700 border dark:border-gray-600 text-gray-800 dark:text-gray-100 rounded-tl-none'
                                }`}>
                                    {m.text}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="p-3 bg-white dark:bg-gray-800 border-t dark:border-gray-700 flex gap-2">
                        <input 
                            className="flex-1 bg-gray-100 dark:bg-gray-700 border-none rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all placeholder-gray-400"
                            placeholder="명령어 입력..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                        <button 
                            onClick={handleSend} 
                            disabled={!input.trim()}
                            className="bg-indigo-600 text-white p-2 rounded-full hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-sm"
                        >
                            <Send size={16} className={input.trim() ? 'ml-0.5' : ''}/>
                        </button>
                    </div>
                </div>
            )}
            <button 
                onClick={() => setIsOpen(!isOpen)} 
                className={`p-4 rounded-full shadow-lg transition-all duration-300 flex items-center justify-center hover:scale-110 ${
                    isOpen ? 'bg-gray-700 text-white rotate-90' : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                }`}
            >
                {isOpen ? <X size={24}/> : <MessageSquare size={24} fill="currentColor" />}
            </button>
        </div>
    );
};

export default AiChatbot;