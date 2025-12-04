import React, { useState } from 'react';
import { Clock, Copy } from 'lucide-react';
import { AD_CYCLES } from '../utils/dataProcessor';

const AdManager = ({ data, history, setHistory }) => {
  const [filterLevel, setFilterLevel] = useState('all'); 
  const [filterType, setFilterType] = useState('all');   
  const [filterCat, setFilterCat] = useState('all');     
  const [requests, setRequests] = useState({}); 

  const getStatus = (nick, levelCat, adType) => {
    const key = `${nick}_${adType}`;
    const lastDateStr = history[key];
    if (!lastDateStr) return { cool: false, msg: '신청 가능' };
    const typeMain = adType.includes('전화') ? '전화' : '채팅';
    const sub = adType.match(/\((.+)\)/)[1];
    const cycles = AD_CYCLES[levelCat] || AD_CYCLES['그린'];
    const weeksNeed = cycles[typeMain][sub] || 4;
    const diff = Math.floor(Math.abs(new Date() - new Date(lastDateStr)) / (1000 * 60 * 60 * 24 * 7));
    const left = weeksNeed - diff;
    return left > 0 ? { cool: true, msg: `${left}주 남음`, date: lastDateStr } : { cool: false, msg: '신청 가능' };
  };

  const handleApply = (nick, levelCat, adType) => {
    const isPhone = adType.includes('전화');
    const groupKey = `${levelCat}`;
    const currentGroupRequests = requests[groupKey] || {};
    
    let hasConflict = false;
    const oppositeType = isPhone ? '채팅' : '전화';
    
    Object.keys(currentGroupRequests).forEach(reqType => {
        if (reqType.includes(oppositeType) && currentGroupRequests[reqType].includes(nick)) {
            hasConflict = true;
        }
    });

    if (hasConflict) {
        alert(`${nick}님은 이미 [${oppositeType}] 광고를 신청하셨습니다.\n전화와 채팅 광고는 동시에 신청할 수 없습니다.`);
        return;
    }

    if(!confirm(`${nick}님의 [${adType}] 광고를 신청합니까?`)) return;
    const key = `${nick}_${adType}`;
    setHistory(p => ({ ...p, [key]: new Date().toISOString().split('T')[0] }));
    
    setRequests(prev => {
        const newReq = { ...prev };
        if(!newReq[groupKey]) newReq[groupKey] = {};
        if(!newReq[groupKey][adType]) newReq[groupKey][adType] = [];
        if(!newReq[groupKey][adType].includes(nick)) newReq[groupKey][adType].push(nick);
        return newReq;
    });
  };

  const generateRequestText = () => {
    let text = '';
    const ORDERED_KEYS = ['전화(메인)', '전화(타로)', '전화(사주)', '전화(신점)', '채팅(메인)', '채팅(타로)', '채팅(사주)', '채팅(신점)'];
    ['그린', '퍼플'].forEach(lv => {
        text += `[${lv}]\n`;
        const group = requests[lv] || {};
        ORDERED_KEYS.forEach(key => {
            const list = group[key] || [];
            const label = key.replace('(','').replace(')','');
            text += `${label} ${list.join(', ')}\n`;
        });
        text += '\n';
    });
    return text.trim();
  };

  const filteredData = data.filter(r => {
      if(r.adEligibleTypes.length === 0) return false;
      if(filterLevel !== 'all' && r.levelCat !== filterLevel) return false;
      if(filterType === 'phone' && !r.adEligibleTypes.some(t => t.includes('전화'))) return false;
      if(filterType === 'chat' && !r.adEligibleTypes.some(t => t.includes('채팅'))) return false;
      if(filterCat !== 'all' && r.category !== filterCat) return false;
      return true;
  });

  const FilterBtn = ({ active, label, onClick }) => (
      <button onClick={onClick} className={`px-4 py-1.5 text-sm rounded-full border transition-colors ${active?'bg-indigo-600 text-white border-indigo-600':'bg-white text-gray-600 hover:bg-gray-50'}`}>{label}</button>
  );

  return (
    <div className="flex gap-6 h-[700px]">
      <div className="flex-1 flex flex-col h-full">
        <div className="mb-4 bg-gray-50 p-4 rounded-lg flex flex-wrap items-center gap-x-6 gap-y-3 border border-gray-100">
            <div className="flex items-center gap-2"><span className="font-bold text-gray-700 text-sm">등급:</span>{['all', '그린', '퍼플'].map(f => <FilterBtn key={f} active={filterLevel===f} label={f==='all'?'전체':f} onClick={()=>setFilterLevel(f)}/>)}</div>
            <div className="hidden md:block w-px h-5 bg-gray-300"></div>
            <div className="flex items-center gap-2"><span className="font-bold text-gray-700 text-sm">서비스:</span>{['all', 'phone', 'chat'].map(f => <FilterBtn key={f} active={filterType===f} label={f==='all'?'전체':f==='phone'?'전화':'채팅'} onClick={()=>setFilterType(f)}/>)}</div>
            <div className="hidden md:block w-px h-5 bg-gray-300"></div>
            <div className="flex items-center gap-2"><span className="font-bold text-gray-700 text-sm">분야:</span>{['all', '타로', '사주', '신점'].map(f => <FilterBtn key={f} active={filterCat===f} label={f==='all'?'전체':f} onClick={()=>setFilterCat(f)}/>)}</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto pr-2 flex-1">
            {filteredData.map((r, i) => {
                const phoneAds = r.adEligibleTypes.filter(t => t.includes('전화')).sort((a,b) => a.includes('메인') ? -1 : 1);
                const chatAds = r.adEligibleTypes.filter(t => t.includes('채팅')).sort((a,b) => a.includes('메인') ? -1 : 1);

                const isPurple = r.levelCat.includes('퍼플');
                const themeClass = isPurple ? 'bg-purple-50 border-purple-100' : 'bg-green-50 border-green-100';
                const textClass = isPurple ? 'text-purple-900' : 'text-green-900';
                const btnClass = isPurple ? 'bg-purple-600 hover:bg-purple-700' : 'bg-green-600 hover:bg-green-700';

                return (
                    <div key={i} className="border border-gray-200 rounded-lg p-5 bg-white shadow-sm h-fit hover:border-indigo-300 transition-colors">
                        <div className="flex justify-between mb-4 pb-2 border-b">
                            <span className="font-bold text-gray-800 text-lg">{r.nick} <span className="text-sm font-normal text-gray-500 ml-1">{r.levelCat} {r.level}</span></span>
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded font-medium h-fit">{r.category}</span>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-4">
                            {phoneAds.length > 0 && (
                                <div>
                                    <div className="text-xs font-bold text-gray-500 mb-2 flex items-center gap-1">📞 전화 상담</div>
                                    <div className="flex flex-col gap-2">
                                        {phoneAds.map(ad => {
                                            if(filterType === 'chat') return null;
                                            const s = getStatus(r.nick, r.levelCat, ad);
                                            return (
                                                <div key={ad} className={`flex justify-between items-center text-sm p-2.5 rounded border ${themeClass}`}>
                                                    <span className={`font-medium ${textClass}`}>{ad}</span>
                                                    <div className="flex gap-2 items-center">
                                                        {s.cool ? <span className="text-red-500 font-bold bg-white px-2 py-1 rounded border border-red-100 flex items-center gap-1 text-xs"><Clock size={12}/> {s.msg}</span> 
                                                        : <button onClick={()=>handleApply(r.nick, r.levelCat, ad)} className={`${btnClass} text-white px-3 py-1 rounded transition shadow-sm text-xs font-bold`}>신청</button>}
                                                        {s.date && <button onClick={()=>{ if(confirm('기록삭제?')) { const n={...history}; delete n[`${r.nick}_${ad}`]; setHistory(n); }}} className="text-gray-400 hover:text-red-500 p-1">×</button>}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

                            {chatAds.length > 0 && (
                                <div>
                                    <div className="text-xs font-bold text-gray-500 mb-2 flex items-center gap-1 mt-1">💬 채팅 상담</div>
                                    <div className="flex flex-col gap-2">
                                        {chatAds.map(ad => {
                                            if(filterType === 'phone') return null;
                                            const s = getStatus(r.nick, r.levelCat, ad);
                                            return (
                                                <div key={ad} className={`flex justify-between items-center text-sm p-2.5 rounded border ${themeClass}`}>
                                                    <span className={`font-medium ${textClass}`}>{ad}</span>
                                                    <div className="flex gap-2 items-center">
                                                        {s.cool ? <span className="text-red-500 font-bold bg-white px-2 py-1 rounded border border-red-100 flex items-center gap-1 text-xs"><Clock size={12}/> {s.msg}</span> 
                                                        : <button onClick={()=>handleApply(r.nick, r.levelCat, ad)} className={`${btnClass} text-white px-3 py-1 rounded transition shadow-sm text-xs font-bold`}>신청</button>}
                                                        {s.date && <button onClick={()=>{ if(confirm('기록삭제?')) { const n={...history}; delete n[`${r.nick}_${ad}`]; setHistory(n); }}} className="text-gray-400 hover:text-red-500 p-1">×</button>}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
      </div>
      <div className="w-80 shrink-0 h-full">
        <div className="border rounded-xl shadow-lg bg-white p-5 h-full flex flex-col border-indigo-100">
            <h3 className="font-bold mb-4 flex items-center gap-2 text-gray-800 text-base"><Copy size={20} className="text-indigo-600"/> 신청서 자동 생성</h3>
            <textarea className="w-full flex-1 border rounded p-3 text-sm font-mono mb-4 bg-gray-50 focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-gray-700 leading-relaxed" readOnly value={generateRequestText()} />
            <div className="flex gap-3">
                <button onClick={()=>{navigator.clipboard.writeText(generateRequestText()); alert("복사되었습니다!")}} className="flex-1 bg-green-600 text-white py-2.5 rounded hover:bg-green-700 font-bold text-sm shadow-sm transition">전체 복사</button>
                <button onClick={()=>setRequests({})} className="flex-1 bg-gray-100 text-gray-600 py-2.5 rounded hover:bg-gray-200 font-bold text-sm transition">초기화</button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AdManager;