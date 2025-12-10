import React, { useState } from 'react';
import { Clock, Copy, XCircle, AlertCircle, RotateCcw, FileSpreadsheet, X, Check } from 'lucide-react';
import { AD_CYCLES } from '../utils/dataProcessor';

// [팝업] 광고 이력 붙여넣기 모달
const HistoryPasteModal = ({ isOpen, onClose, onConfirm }) => {
    const [text, setText] = useState('');
    
    const parseAndApply = () => {
        if(!text.trim()) return onClose();
        
        const lines = text.trim().split('\n').map(l => l.split('\t'));
        if(lines.length < 2) return alert("데이터 형식이 올바르지 않습니다.");

        const headers = lines[0]; // 헤더 (광고 타입들)
        const newHistory = {};
        const year = new Date().getFullYear();

        // 1행부터 데이터 파싱
        for(let i=1; i<lines.length; i++) {
            const row = lines[i];
            const nick = row[0]?.trim();
            if(!nick) continue;

            // 각 열(광고타입) 순회
            for(let j=1; j<row.length; j++) {
                const dateRange = row[j]?.trim(); // 예: "11.24 ~ 11.30"
                const adType = headers[j]?.trim(); // 예: "전화(메인)"

                if(nick && adType && dateRange && dateRange.includes('~')) {
                    // 시작 날짜("11.24")만 추출해서 저장
                    const startDateStr = dateRange.split('~')[0].trim(); // "11.24"
                    const [m, d] = startDateStr.split('.').map(Number);
                    
                    if(m && d) {
                        // 날짜 객체 생성 (YYYY-MM-DD 포맷)
                        const dateObj = new Date(year, m - 1, d); // 월은 0부터 시작
                        // 한국 시간대 오차 방지를 위해 날짜 문자열로 변환
                        const yyyy = dateObj.getFullYear();
                        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
                        const dd = String(dateObj.getDate()).padStart(2, '0');
                        
                        const key = `${nick}_${adType}`;
                        newHistory[key] = `${yyyy}-${mm}-${dd}`;
                    }
                }
            }
        }

        const count = Object.keys(newHistory).length;
        if(count > 0) {
            onConfirm(newHistory);
            alert(`${count}건의 광고 이력이 적용되었습니다.`);
            onClose();
        } else {
            alert("인식된 데이터가 없습니다. 형식을 확인해주세요.");
        }
    };

    if(!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-xl w-[600px] border dark:border-gray-700">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg dark:text-gray-100">광고 이력 붙여넣기 (구글시트)</h3>
                    <button onClick={onClose}><X className="text-gray-500" /></button>
                </div>
                <div className="text-xs text-gray-500 mb-2">
                    * 구글시트의 헤더(닉네임, 전화(메인)...)부터 데이터까지 전체를 드래그 복사해서 붙여넣으세요.
                </div>
                <textarea 
                    className="w-full h-64 border dark:border-gray-600 p-3 text-xs mb-4 bg-gray-50 dark:bg-gray-900 rounded outline-none dark:text-white whitespace-pre" 
                    placeholder={`닉네임\t전화(메인)\t전화(타로)...\n홍길동\t11.24 ~ 11.30\t...`}
                    value={text} onChange={e=>setText(e.target.value)}
                />
                <button onClick={parseAndApply} className="w-full bg-indigo-600 text-white py-3 rounded font-bold hover:bg-indigo-700 flex justify-center items-center gap-2">
                    <Check size={18}/> 이력 적용하기
                </button>
            </div>
        </div>
    );
};

const AdManager = ({ data, history, setHistory }) => {
  const [filterLevel, setFilterLevel] = useState('all'); 
  const [filterType, setFilterType] = useState('all');   
  const [filterCat, setFilterCat] = useState('all');     
  const [requests, setRequests] = useState({}); 
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // [수정] 이력 병합 함수
  const handleHistoryUpdate = (newHistory) => {
      setHistory(prev => ({ ...prev, ...newHistory }));
  };

  const getStatus = (nick, levelCat, adType) => {
    const isPhone = adType.includes('전화');
    const typeMain = isPhone ? '전화' : '채팅';
    const cleanLevelCat = levelCat.includes('퍼플') ? '퍼플' : '그린';
    
    const myKey = `${nick}_${adType}`;
    if (history[myKey]) {
        const lastDateStr = history[myKey];
        const subMatch = adType.match(/\((.+)\)/);
        const sub = subMatch ? subMatch[1] : '메인';
        
        const cycles = AD_CYCLES[cleanLevelCat] || AD_CYCLES['그린'];
        const weeksNeed = cycles[typeMain][sub] || 4;
        
        // 날짜 차이 계산
        const diff = Math.floor((new Date() - new Date(lastDateStr)) / (1000 * 60 * 60 * 24 * 7));
        const left = weeksNeed - diff;
        
        if (left > 0) return { status: 'cool', msg: `${left}주 남음`, date: lastDateStr, key: myKey };
    }

    const isMainTarget = adType.includes('메인');
    const myMediumPrefix = isPhone ? '전화' : '채팅';
    
    const conflictEntry = Object.keys(history).find(key => {
        if (!key.startsWith(`${nick}_${myMediumPrefix}`)) return false; 
        if (key === myKey) return false; 

        const recordedDate = history[key];
        const recordedAdType = key.split('_')[1]; 
        const recordedSub = recordedAdType.match(/\((.+)\)/)[1]; 
        
        const cycles = AD_CYCLES[cleanLevelCat] || AD_CYCLES['그린'];
        const weeksNeed = cycles[typeMain][recordedSub] || 4; 
        const diff = Math.floor((new Date() - new Date(recordedDate)) / (1000 * 60 * 60 * 24 * 7));
        
        return (weeksNeed - diff) > 0; 
    });

    if (conflictEntry) {
        const conflictType = conflictEntry.split('_')[1];
        const conflictLabel = conflictType.includes('메인') ? '메인' : '분야';
        return { status: 'blocked', msg: `${conflictLabel} 진행중` };
    }

    return { status: 'available', msg: '신청 가능' };
  };

  const handleApply = (nick, levelCat, adType) => {
    const isPhone = adType.includes('전화');
    const groupKey = levelCat.includes('퍼플') ? '퍼플' : '그린';
    const currentGroupRequests = requests[groupKey] || {};
    let hasConflict = false;
    const oppositeType = isPhone ? '채팅' : '전화';
    
    Object.keys(currentGroupRequests).forEach(reqType => {
        if (reqType.includes(oppositeType) && currentGroupRequests[reqType].includes(nick)) hasConflict = true;
    });

    if (hasConflict) return alert(`${nick}님은 이미 [${oppositeType}] 광고를 신청하셨습니다.`);
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

  const handleCancel = (nick, adType, adKey) => {
      if(!confirm('기록을 삭제하고 신청을 취소하시겠습니까?')) return;
      const newHistory = { ...history };
      delete newHistory[adKey];
      setHistory(newHistory);

      setRequests(prev => {
          const newReq = { ...prev };
          ['그린', '퍼플'].forEach(group => {
              if (newReq[group] && newReq[group][adType]) {
                  newReq[group][adType] = newReq[group][adType].filter(n => n !== nick);
                  if (newReq[group][adType].length === 0) delete newReq[group][adType];
              }
          });
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
            if (list.length > 0) {
                const label = key.replace('(','').replace(')','');
                text += `${label} ${list.join(', ')}\n`;
            }
        });
        text += '\n';
    });
    return text.trim(); // 기본 틀은 항상 유지됨
  };

  const filteredData = data.filter(r => {
      if(r.adEligibleTypes.length === 0) return false;
      if(filterLevel !== 'all' && !r.levelCat.includes(filterLevel)) return false;
      if(filterType === 'phone' && !r.adEligibleTypes.some(t => t.includes('전화'))) return false;
      if(filterType === 'chat' && !r.adEligibleTypes.some(t => t.includes('채팅'))) return false;
      if(filterCat !== 'all' && !r.category.includes(filterCat)) return false;
      return true;
  });

  const FilterBtn = ({ active, label, onClick }) => (
      <button onClick={onClick} className={`px-4 py-1.5 text-sm rounded-full border transition-colors ${active?'bg-indigo-600 text-white border-indigo-600 dark:bg-indigo-500':'bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600'}`}>{label}</button>
  );

  return (
    <div className="flex gap-6 h-[700px]">
      <div className="flex-1 flex flex-col h-full">
        {/* 상단 필터 및 버튼 영역 */}
        <div className="mb-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg flex flex-wrap items-center justify-between gap-y-3 border border-gray-100 dark:border-gray-700">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                <div className="flex items-center gap-2"><span className="font-bold text-gray-700 dark:text-gray-300 text-sm">등급:</span>{['all', '그린', '퍼플'].map(f => <FilterBtn key={f} active={filterLevel===f} label={f==='all'?'전체':f} onClick={()=>setFilterLevel(f)}/>)}</div>
                <div className="hidden md:block w-px h-5 bg-gray-300 dark:bg-gray-600"></div>
                <div className="flex items-center gap-2"><span className="font-bold text-gray-700 dark:text-gray-300 text-sm">서비스:</span>{['all', 'phone', 'chat'].map(f => <FilterBtn key={f} active={filterType===f} label={f==='all'?'전체':f==='phone'?'전화':'채팅'} onClick={()=>setFilterType(f)}/>)}</div>
                <div className="hidden md:block w-px h-5 bg-gray-300 dark:bg-gray-600"></div>
                <div className="flex items-center gap-2"><span className="font-bold text-gray-700 dark:text-gray-300 text-sm">분야:</span>{['all', '타로', '사주', '신점'].map(f => <FilterBtn key={f} active={filterCat===f} label={f==='all'?'전체':f} onClick={()=>setFilterCat(f)}/>)}</div>
            </div>
            {/* 이력 관리 버튼들 */}
            <div className="flex gap-2">
                <button onClick={()=>setShowHistoryModal(true)} className="flex items-center gap-1 bg-green-600 text-white px-3 py-1.5 rounded text-sm font-bold hover:bg-green-700 transition shadow-sm">
                    <FileSpreadsheet size={16}/> 이력 붙여넣기
                </button>
                <button onClick={()=>{if(confirm('모든 광고 이력을 초기화하시겠습니까?')) setHistory({})}} className="flex items-center gap-1 bg-red-100 text-red-600 px-3 py-1.5 rounded text-sm font-bold hover:bg-red-200 transition border border-red-200">
                    <RotateCcw size={16}/> 이력 초기화
                </button>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto pr-2 flex-1">
            {filteredData.map((r, i) => {
                const phoneAds = r.adEligibleTypes.filter(t => t.includes('전화')).sort((a,b) => a.includes('메인') ? -1 : 1);
                const chatAds = r.adEligibleTypes.filter(t => t.includes('채팅')).sort((a,b) => a.includes('메인') ? -1 : 1);
                const isPurple = r.levelCat.includes('퍼플');
                const themeClass = isPurple ? 'bg-purple-50 border-purple-100 dark:bg-purple-900/20 dark:border-purple-800' : 'bg-green-50 border-green-100 dark:bg-green-900/20 dark:border-green-800';
                const textClass = isPurple ? 'text-purple-900 dark:text-purple-200' : 'text-green-900 dark:text-green-200';
                const btnClass = isPurple ? 'bg-purple-600 hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-500' : 'bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-500';

                return (
                    <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg p-5 bg-white dark:bg-gray-800 shadow-sm h-fit hover:border-indigo-300 dark:hover:border-indigo-500 transition-colors">
                        <div className="flex justify-between mb-4 pb-2 border-b dark:border-gray-700">
                            <span className="font-bold text-gray-800 dark:text-gray-100 text-lg">{r.nick} <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-1">{r.levelCat} {r.level}</span></span>
                            <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded font-medium h-fit">{r.category}</span>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                            {phoneAds.length > 0 && (
                                <div>
                                    <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">📞 전화 상담</div>
                                    <div className="flex flex-col gap-2">
                                        {phoneAds.map(ad => {
                                            if(filterType === 'chat') return null;
                                            const s = getStatus(r.nick, r.levelCat, ad);
                                            const isBlocked = s.status === 'blocked';
                                            const isCool = s.status === 'cool';
                                            return (
                                                <div key={ad} className={`flex justify-between items-center text-sm p-2.5 rounded border ${themeClass}`}>
                                                    <span className={`font-medium ${textClass}`}>{ad}</span>
                                                    <div className="flex gap-2 items-center">
                                                        {isCool ? <span className="text-red-500 dark:text-red-400 font-bold bg-white dark:bg-gray-700 px-2 py-1 rounded border border-red-100 dark:border-red-900 flex items-center gap-1 text-xs"><Clock size={12}/> {s.msg}</span> 
                                                        : isBlocked ? <span className="text-gray-400 dark:text-gray-500 font-bold bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded border border-gray-200 dark:border-gray-600 flex items-center gap-1 text-xs cursor-not-allowed" title="다른 유형의 광고 진행중"><AlertCircle size={12}/> {s.msg}</span>
                                                        : <button onClick={()=>handleApply(r.nick, r.levelCat, ad)} className={`${btnClass} text-white px-3 py-1 rounded transition shadow-sm text-xs font-bold`}>신청</button>}
                                                        {s.date && <button onClick={()=>handleCancel(r.nick, ad, s.key)} className="text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 p-1"><XCircle size={16}/></button>}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}
                            {chatAds.length > 0 && (
                                <div>
                                    <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1 mt-1">💬 채팅 상담</div>
                                    <div className="flex flex-col gap-2">
                                        {chatAds.map(ad => {
                                            if(filterType === 'phone') return null;
                                            const s = getStatus(r.nick, r.levelCat, ad);
                                            const isBlocked = s.status === 'blocked';
                                            const isCool = s.status === 'cool';
                                            return (
                                                <div key={ad} className={`flex justify-between items-center text-sm p-2.5 rounded border ${themeClass}`}>
                                                    <span className={`font-medium ${textClass}`}>{ad}</span>
                                                    <div className="flex gap-2 items-center">
                                                        {isCool ? <span className="text-red-500 dark:text-red-400 font-bold bg-white dark:bg-gray-700 px-2 py-1 rounded border border-red-100 dark:border-red-900 flex items-center gap-1 text-xs"><Clock size={12}/> {s.msg}</span> 
                                                        : isBlocked ? <span className="text-gray-400 dark:text-gray-500 font-bold bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded border border-gray-200 dark:border-gray-600 flex items-center gap-1 text-xs cursor-not-allowed"><AlertCircle size={12}/> {s.msg}</span>
                                                        : <button onClick={()=>handleApply(r.nick, r.levelCat, ad)} className={`${btnClass} text-white px-3 py-1 rounded transition shadow-sm text-xs font-bold`}>신청</button>}
                                                        {s.date && <button onClick={()=>handleCancel(r.nick, ad, s.key)} className="text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 p-1"><XCircle size={16}/></button>}
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
        <div className="border rounded-xl shadow-lg bg-white dark:bg-gray-800 p-5 h-full flex flex-col border-indigo-100 dark:border-gray-700 transition-colors">
            <h3 className="font-bold mb-4 flex items-center gap-2 text-gray-800 dark:text-gray-100 text-base"><Copy size={20} className="text-indigo-600 dark:text-indigo-400"/> 신청서 자동 생성</h3>
            <textarea className="w-full flex-1 border rounded p-3 text-sm font-mono mb-4 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-gray-700 dark:text-gray-200 leading-relaxed border-gray-200 dark:border-gray-700" readOnly value={generateRequestText()} />
            <div className="flex gap-3">
                <button onClick={()=>{navigator.clipboard.writeText(generateRequestText()); alert("복사되었습니다!")}} className="flex-1 bg-green-600 text-white py-2.5 rounded hover:bg-green-700 font-bold text-sm shadow-sm transition dark:bg-green-700 dark:hover:bg-green-600">전체 복사</button>
                <button onClick={()=>setRequests({})} className="flex-1 bg-gray-100 text-gray-600 py-2.5 rounded hover:bg-gray-200 font-bold text-sm transition dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">초기화</button>
            </div>
        </div>
      </div>
      
      {/* 팝업 모달 */}
      <HistoryPasteModal isOpen={showHistoryModal} onClose={()=>setShowHistoryModal(false)} onConfirm={handleHistoryUpdate} />
    </div>
  );
};

export default AdManager;