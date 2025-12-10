import React, { useState, useEffect } from 'react';
import { Clock, Copy, XCircle, AlertCircle } from 'lucide-react';
import { AD_CYCLES } from '../utils/dataProcessor';

const AdManager = ({ data, history, setHistory }) => {
  const [filterLevel, setFilterLevel] = useState('all'); 
  const [filterType, setFilterType] = useState('all');   
  const [filterCat, setFilterCat] = useState('all');     
  const [requests, setRequests] = useState({}); 

  // [수정 2, 3] 상태 체크 로직 강화 (상호 배타적 쿨타임 적용)
  const getStatus = (nick, levelCat, adType) => {
    const isPhone = adType.includes('전화');
    const typeMain = isPhone ? '전화' : '채팅';
    const cleanLevelCat = levelCat.includes('퍼플') ? '퍼플' : '그린';
    
    // 1. 자기 자신의 쿨타임 체크
    const myKey = `${nick}_${adType}`;
    if (history[myKey]) {
        const lastDateStr = history[myKey];
        const sub = adType.match(/\((.+)\)/)[1];
        const cycles = AD_CYCLES[cleanLevelCat] || AD_CYCLES['그린'];
        const weeksNeed = cycles[typeMain][sub] || 4;
        const diff = Math.floor(Math.abs(new Date() - new Date(lastDateStr)) / (1000 * 60 * 60 * 24 * 7));
        const left = weeksNeed - diff;
        
        if (left > 0) return { status: 'cool', msg: `${left}주 남음`, date: lastDateStr, key: myKey };
    }

    // 2. 형제 광고(메인 <-> 분야) 쿨타임 체크
    // (예: 전화(메인) 신청하려면 전화(신점)이 없어야 함)
    const isMainTarget = adType.includes('메인');
    const myMediumPrefix = isPhone ? '전화' : '채팅';
    
    // history를 뒤져서 같은 매체(전화/채팅)의 다른 광고가 살아있는지 확인
    const conflictEntry = Object.keys(history).find(key => {
        if (!key.startsWith(`${nick}_${myMediumPrefix}`)) return false; // 내 닉네임 + 같은 매체 아니면 패스
        if (key === myKey) return false; // 나 자신은 위에서 체크했음

        // 해당 기록의 잔여 기간 계산
        const recordedDate = history[key];
        const recordedAdType = key.split('_')[1]; // 예: 전화(신점)
        const recordedSub = recordedAdType.match(/\((.+)\)/)[1]; // 신점
        
        const cycles = AD_CYCLES[cleanLevelCat] || AD_CYCLES['그린'];
        const weeksNeed = cycles[typeMain][recordedSub] || 4; // 그 광고의 필요 주수
        const diff = Math.floor(Math.abs(new Date() - new Date(recordedDate)) / (1000 * 60 * 60 * 24 * 7));
        
        return (weeksNeed - diff) > 0; // 아직 기간이 남아있으면 충돌!
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
    
    // [기존 유지] 전화/채팅 동시 신청 방지
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
    
    // 1. 히스토리 업데이트 (쿨타임 시작)
    const key = `${nick}_${adType}`;
    setHistory(p => ({ ...p, [key]: new Date().toISOString().split('T')[0] }));
    
    // 2. 신청서 명단 업데이트
    setRequests(prev => {
        const newReq = { ...prev };
        if(!newReq[groupKey]) newReq[groupKey] = {};
        if(!newReq[groupKey][adType]) newReq[groupKey][adType] = [];
        if(!newReq[groupKey][adType].includes(nick)) newReq[groupKey][adType].push(nick);
        return newReq;
    });
  };

  // [수정 4] 취소 시 신청서 명단에서도 이름 제거
  const handleCancel = (nick, adType, adKey) => {
      if(!confirm('기록을 삭제하고 신청을 취소하시겠습니까?')) return;

      // 1. 히스토리에서 삭제
      const newHistory = { ...history };
      delete newHistory[adKey];
      setHistory(newHistory);

      // 2. 신청서 명단에서 삭제
      setRequests(prev => {
          const newReq = { ...prev };
          // 모든 그룹(그린/퍼플)을 순회하며 해당 닉네임 제거
          ['그린', '퍼플'].forEach(group => {
              if (newReq[group] && newReq[group][adType]) {
                  newReq[group][adType] = newReq[group][adType].filter(n => n !== nick);
                  // 배열이 비었으면 키 삭제 (선택사항)
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
    return text.trim();
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
        <div className="mb-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg flex flex-wrap items-center gap-x-6 gap-y-3 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2"><span className="font-bold text-gray-700 dark:text-gray-300 text-sm">등급:</span>{['all', '그린', '퍼플'].map(f => <FilterBtn key={f} active={filterLevel===f} label={f==='all'?'전체':f} onClick={()=>setFilterLevel(f)}/>)}</div>
            <div className="hidden md:block w-px h-5 bg-gray-300 dark:bg-gray-600"></div>
            <div className="flex items-center gap-2"><span className="font-bold text-gray-700 dark:text-gray-300 text-sm">서비스:</span>{['all', 'phone', 'chat'].map(f => <FilterBtn key={f} active={filterType===f} label={f==='all'?'전체':f==='phone'?'전화':'채팅'} onClick={()=>setFilterType(f)}/>)}</div>
            <div className="hidden md:block w-px h-5 bg-gray-300 dark:bg-gray-600"></div>
            <div className="flex items-center gap-2"><span className="font-bold text-gray-700 dark:text-gray-300 text-sm">분야:</span>{['all', '타로', '사주', '신점'].map(f => <FilterBtn key={f} active={filterCat===f} label={f==='all'?'전체':f} onClick={()=>setFilterCat(f)}/>)}</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto pr-2 flex-1">
            {filteredData.map((r, i) => {
                const phoneAds = r.adEligibleTypes.filter(t => t.includes('전화')).sort((a,b) => a.includes('메인') ? -1 : 1);
                const chatAds = r.adEligibleTypes.filter(t => t.includes('채팅')).sort((a,b) => a.includes('메인') ? -1 : 1);

                const isPurple = r.levelCat.includes('퍼플');
                // [수정 1] 다크모드 가독성 개선 (배경 및 텍스트 색상)
                const themeClass = isPurple 
                    ? 'bg-purple-50 border-purple-100 dark:bg-purple-900/20 dark:border-purple-800' 
                    : 'bg-green-50 border-green-100 dark:bg-green-900/20 dark:border-green-800';
                
                // 텍스트 색상을 다크모드에서 밝게(200~300) 조정
                const textClass = isPurple 
                    ? 'text-purple-900 dark:text-purple-200' 
                    : 'text-green-900 dark:text-green-200';
                
                const btnClass = isPurple 
                    ? 'bg-purple-600 hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-500' 
                    : 'bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-500';

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
                                            
                                            // [수정] 비활성화(Blocked) 상태 UI 처리
                                            const isBlocked = s.status === 'blocked';
                                            const isCool = s.status === 'cool';

                                            return (
                                                <div key={ad} className={`flex justify-between items-center text-sm p-2.5 rounded border ${themeClass}`}>
                                                    <span className={`font-medium ${textClass}`}>{ad}</span>
                                                    <div className="flex gap-2 items-center">
                                                        {isCool ? (
                                                            <span className="text-red-500 dark:text-red-400 font-bold bg-white dark:bg-gray-700 px-2 py-1 rounded border border-red-100 dark:border-red-900 flex items-center gap-1 text-xs">
                                                                <Clock size={12}/> {s.msg}
                                                            </span>
                                                        ) : isBlocked ? (
                                                            <span className="text-gray-400 dark:text-gray-500 font-bold bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded border border-gray-200 dark:border-gray-600 flex items-center gap-1 text-xs cursor-not-allowed" title="다른 유형의 광고가 진행 중입니다">
                                                                <AlertCircle size={12}/> {s.msg}
                                                            </span>
                                                        ) : (
                                                            <button onClick={()=>handleApply(r.nick, r.levelCat, ad)} className={`${btnClass} text-white px-3 py-1 rounded transition shadow-sm text-xs font-bold`}>신청</button>
                                                        )}
                                                        
                                                        {s.date && (
                                                            <button onClick={()=>handleCancel(r.nick, ad, s.key)} className="text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 p-1" title="기록 삭제 및 취소">
                                                                <XCircle size={16}/>
                                                            </button>
                                                        )}
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
                                                        {isCool ? (
                                                            <span className="text-red-500 dark:text-red-400 font-bold bg-white dark:bg-gray-700 px-2 py-1 rounded border border-red-100 dark:border-red-900 flex items-center gap-1 text-xs">
                                                                <Clock size={12}/> {s.msg}
                                                            </span>
                                                        ) : isBlocked ? (
                                                            <span className="text-gray-400 dark:text-gray-500 font-bold bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded border border-gray-200 dark:border-gray-600 flex items-center gap-1 text-xs cursor-not-allowed">
                                                                <AlertCircle size={12}/> {s.msg}
                                                            </span>
                                                        ) : (
                                                            <button onClick={()=>handleApply(r.nick, r.levelCat, ad)} className={`${btnClass} text-white px-3 py-1 rounded transition shadow-sm text-xs font-bold`}>신청</button>
                                                        )}
                                                        
                                                        {s.date && (
                                                            <button onClick={()=>handleCancel(r.nick, ad, s.key)} className="text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 p-1">
                                                                <XCircle size={16}/>
                                                            </button>
                                                        )}
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
    </div>
  );
};

export default AdManager;