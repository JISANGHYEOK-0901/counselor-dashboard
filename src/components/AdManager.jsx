import React, { useState } from 'react';
import { Clock, Copy, XCircle, FileSpreadsheet, X, FilePlus, RotateCcw } from 'lucide-react';
import { AD_CYCLES } from '../utils/dataProcessor';
import UploadBox from './UploadBox'; 

// 날짜 포맷 헬퍼 (MM.DD)
const fmtDate = (d) => `${d.getMonth()+1}.${d.getDate()}`;

// [로직] 신청일 기준 "차주 월요일 ~ 일요일" 계산
const calculateAdPeriod = (applyDateStr) => {
    if (!applyDateStr) return null;
    const applyDate = new Date(applyDateStr);
    const day = applyDate.getDay(); 
    
    const distToNextMon = day === 1 ? 7 : (8 - day) % 7;
    
    const startObj = new Date(applyDate);
    startObj.setDate(applyDate.getDate() + distToNextMon);
    
    const endObj = new Date(startObj);
    endObj.setDate(startObj.getDate() + 6); 

    return `${fmtDate(startObj)}~${fmtDate(endObj)}`;
};

// [팝업] 광고 이력 붙여넣기 모달
const HistoryPasteModal = ({ isOpen, onClose, onConfirm }) => {
    const [text, setText] = useState('');
    const parseAndApply = () => {
        if(!text.trim()) return onClose();
        const lines = text.trim().split('\n').map(l => l.split('\t'));
        if(lines.length < 2) return alert("데이터 형식이 올바르지 않습니다.");
        const headers = lines[0]; 
        const newHistory = {};
        const year = new Date().getFullYear();
        for(let i=1; i<lines.length; i++) {
            const row = lines[i];
            const nick = row[0]?.trim();
            if(!nick) continue;
            for(let j=1; j<row.length; j++) {
                const dateRange = row[j]?.trim(); 
                const adType = headers[j]?.trim(); 
                if(nick && adType && dateRange && dateRange.includes('~')) {
                    const startDateStr = dateRange.split('~')[0].trim();
                    const [m, d] = startDateStr.split('.').map(Number);
                    if(m && d) {
                        const dateObj = new Date(year, m - 1, d);
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
        if(count > 0) { onConfirm(newHistory); alert(`${count}건 적용 완료`); onClose(); } 
        else { alert("인식된 데이터가 없습니다."); }
    };
    if(!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-xl w-[600px] border dark:border-gray-700">
                <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-lg dark:text-gray-100">이력 붙여넣기</h3><button onClick={onClose}><X/></button></div>
                <textarea className="w-full h-64 border dark:border-gray-600 p-3 text-xs mb-4 bg-gray-50 dark:bg-gray-900 rounded outline-none dark:text-white whitespace-pre" placeholder="엑셀 복사 붙여넣기..." value={text} onChange={e=>setText(e.target.value)}/>
                <button onClick={parseAndApply} className="w-full bg-indigo-600 text-white py-3 rounded font-bold hover:bg-indigo-700">적용하기</button>
            </div>
        </div>
    );
};

const AdManager = ({ data, history, setHistory, manualAdData, onUploadManual, onResetManual }) => {
  // 필터 상태들
  const [filterSource, setFilterSource] = useState('all'); 
  const [filterLevel, setFilterLevel] = useState('all'); 
  const [filterType, setFilterType] = useState('all');   
  const [filterField, setFilterField] = useState('all'); // [NEW] 분야 필터 추가 (타로, 사주, 신점)
  
  const [requests, setRequests] = useState({}); 
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const handleHistoryUpdate = (newHistory) => { setHistory(prev => ({ ...prev, ...newHistory })); };

  // 쿨타임 및 상태 확인 로직
  const getStatus = (nick, levelCat, adType) => {
    const isPhone = adType.includes('전화');
    const typeMain = isPhone ? '전화' : '채팅';
    const cleanLevelCat = levelCat.includes('퍼플') ? '퍼플' : '그린';
    
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const checkCoolDown = (targetKey) => {
        if (!history[targetKey]) return null;
        
        const lastDateStr = history[targetKey];
        const lastAppDate = new Date(lastDateStr);
        lastAppDate.setHours(0, 0, 0, 0);

        const recordedAdType = targetKey.split('_')[1];
        const recordedSubMatch = recordedAdType.match(/\((.+)\)/);
        const recordedSub = recordedSubMatch ? recordedSubMatch[1] : '메인';
        
        let totalCycle = AD_CYCLES[cleanLevelCat]?.[typeMain]?.[recordedSub] || 4;

        // 예외 처리
        if (cleanLevelCat === '퍼플' && recordedAdType === '전화(사주)' && nick === '채원') {
            totalCycle = 1;
        }
        if (cleanLevelCat === '퍼플' && recordedSub === '타로' && nick === '해윰' && recordedAdType === '채팅(메인)') {
            totalCycle = 1;
        }

        const diffTime = now.getTime() - lastAppDate.getTime();
        const weeksPassed = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
        const weeksLeft = totalCycle - weeksPassed;
        
        if (weeksLeft > 0) {
            return { status: 'cool', msg: `${weeksLeft}주 남음`, date: lastDateStr, key: targetKey };
        }
        return null;
    };

    const myKey = `${nick}_${adType}`;
    const myStatus = checkCoolDown(myKey);
    if (myStatus) return myStatus;

    const myMediumPrefix = isPhone ? '전화' : '채팅';
    const siblingEntry = Object.keys(history).find(key => {
        return key.startsWith(`${nick}_${myMediumPrefix}`) && key !== myKey;
    });

    if (siblingEntry) {
        const siblingStatus = checkCoolDown(siblingEntry);
        if (siblingStatus) {
            return { status: 'cool', msg: siblingStatus.msg, date: siblingStatus.date, key: siblingStatus.key }; 
        }
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
      if(!confirm('신청 취소 및 기록 삭제?')) return;
      const newHistory = { ...history };
      delete newHistory[adKey];
      setHistory(newHistory);
      setRequests(prev => {
          const newReq = { ...prev };
          ['그린', '퍼플'].forEach(group => {
              if (newReq[group] && newReq[group][adType]) {
                  newReq[group][adType] = newReq[group][adType].filter(n => n !== nick);
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
            const label = key.replace('(','').replace(')','');
            text += `${label} ${list.join(', ')}\n`;
        });
        text += '\n';
    });
    return text.trim();
  };

  // [수정] 데이터 필터링 로직에 '분야(Field)' 추가
  const filteredData = data.filter(r => {
      if (filterSource === 'manual' && !r.isManual) return false;
      if (filterSource === 'auto' && r.isManual) return false;
      if(r.adEligibleTypes.length === 0) return false;
      if(filterLevel !== 'all' && !r.levelCat.includes(filterLevel)) return false;
      if(filterType === 'phone' && !r.adEligibleTypes.some(t => t.includes('전화'))) return false;
      if(filterType === 'chat' && !r.adEligibleTypes.some(t => t.includes('채팅'))) return false;
      
      // [NEW] 분야 필터링 로직
      if(filterField !== 'all' && !r.category.includes(filterField)) return false;

      return true;
  });

  const manualData = filteredData.filter(r => r.isManual);
  const regularData = filteredData.filter(r => !r.isManual);

  const FilterBtn = ({ active, label, onClick }) => (
      <button onClick={onClick} className={`px-4 py-1.5 text-sm rounded-full border transition-colors ${active?'bg-indigo-600 text-white border-indigo-600 dark:bg-indigo-500':'bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600'}`}>{label}</button>
  );

  const renderCard = (r, i, isManual) => {
      const phoneAds = r.adEligibleTypes.filter(t => t.includes('전화')).sort((a,b) => a.includes('메인') ? -1 : 1);
      const chatAds = r.adEligibleTypes.filter(t => t.includes('채팅')).sort((a,b) => a.includes('메인') ? -1 : 1);
      const isPurple = r.levelCat.includes('퍼플');
      const borderClass = isManual ? "border-2 border-yellow-400 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-900/10" : "border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800";
      const themeClass = isPurple ? 'bg-purple-50 border-purple-100 dark:bg-purple-900/20 dark:border-purple-800' : 'bg-green-50 border-green-100 dark:bg-green-900/20 dark:border-green-800';
      const textClass = isPurple ? 'text-purple-900 dark:text-purple-200' : 'text-green-900 dark:text-green-200';
      const btnClass = isPurple ? 'bg-purple-600 hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-500' : 'bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-500';

      let activeAdInfo = null;
      const myEntries = Object.keys(history).filter(k => k.startsWith(r.nick));
      if (myEntries.length > 0) {
          const latestKey = myEntries.reduce((a, b) => history[a] > history[b] ? a : b);
          const applyDate = history[latestKey];
          const adTypeShort = latestKey.split('_')[1];
          const s = getStatus(r.nick, r.levelCat, adTypeShort);
          if (s.status === 'cool') {
              activeAdInfo = { type: adTypeShort, period: calculateAdPeriod(applyDate) };
          }
      }

      return (
        <div key={i} className={`${borderClass} rounded-lg p-5 shadow-sm h-fit transition-colors relative`}>
            {isManual && <div className="absolute -top-3 -right-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded shadow-sm">개별추가</div>}
            
            <div className="flex flex-col mb-4 pb-2 border-b dark:border-gray-700">
                <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-800 dark:text-gray-100 text-lg">
                        {r.nick} <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-1">{r.levelCat} {r.level}</span>
                    </span>
                    <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded font-medium h-fit">{r.category}</span>
                </div>
                
                {activeAdInfo && (
                    <div className="mt-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded w-fit">
                        🗓️ {activeAdInfo.period} {activeAdInfo.type} 진행
                    </div>
                )}
            </div>
            
            <div className="grid grid-cols-1 gap-4">
                {phoneAds.length > 0 && (
                    <div>
                        <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">📞 전화 상담</div>
                        <div className="flex flex-col gap-2">
                            {phoneAds.map(ad => {
                                if(filterType === 'chat') return null;
                                const s = getStatus(r.nick, r.levelCat, ad);
                                const isCool = s.status === 'cool';
                                return (
                                    <div key={ad} className={`flex justify-between items-center text-sm p-2.5 rounded border ${themeClass}`}>
                                        <span className={`font-medium ${textClass}`}>{ad}</span>
                                        <div className="flex gap-2 items-center">
                                            {isCool ? (
                                                <span className="text-red-500 dark:text-red-400 font-bold bg-white dark:bg-gray-700 px-2 py-1 rounded border border-red-100 dark:border-red-900 flex items-center gap-1 text-xs">
                                                    <Clock size={12}/> {s.msg}
                                                </span>
                                            ) : (
                                                <button onClick={()=>handleApply(r.nick, r.levelCat, ad)} className={`${btnClass} text-white px-3 py-1 rounded transition shadow-sm text-xs font-bold`}>신청</button>
                                            )}
                                            {s.date && s.key.includes(ad) && (
                                                <button onClick={()=>handleCancel(r.nick, ad, s.key)} className="text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 p-1"><XCircle size={16}/></button>
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
                        <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 mt-1">💬 채팅 상담</div>
                        <div className="flex flex-col gap-2">
                            {chatAds.map(ad => {
                                if(filterType === 'phone') return null;
                                const s = getStatus(r.nick, r.levelCat, ad);
                                const isCool = s.status === 'cool';
                                return (
                                    <div key={ad} className={`flex justify-between items-center text-sm p-2.5 rounded border ${themeClass}`}>
                                        <span className={`font-medium ${textClass}`}>{ad}</span>
                                        <div className="flex gap-2 items-center">
                                            {isCool ? (
                                                <span className="text-red-500 dark:text-red-400 font-bold bg-white dark:bg-gray-700 px-2 py-1 rounded border border-red-100 dark:border-red-900 flex items-center gap-1 text-xs">
                                                    <Clock size={12}/> {s.msg}
                                                </span>
                                            ) : (
                                                <button onClick={()=>handleApply(r.nick, r.levelCat, ad)} className={`${btnClass} text-white px-3 py-1 rounded transition shadow-sm text-xs font-bold`}>신청</button>
                                            )}
                                            {s.date && s.key.includes(ad) && (
                                                <button onClick={()=>handleCancel(r.nick, ad, s.key)} className="text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 p-1"><XCircle size={16}/></button>
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
      );
  };

  return (
    <div className="flex gap-6 h-[700px]">
      <div className="flex-1 flex flex-col h-full">
        <div className="mb-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg flex flex-wrap items-center justify-between gap-y-3 border border-gray-100 dark:border-gray-700">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                <div className="flex items-center gap-2"><span className="font-bold text-gray-700 dark:text-gray-300 text-sm">구분:</span>{['all', 'auto', 'manual'].map(f => <FilterBtn key={f} active={filterSource===f} label={f==='all'?'전체':f==='auto'?'일반':'개별'} onClick={()=>setFilterSource(f)}/>)}</div>
                
                <div className="hidden md:block w-px h-5 bg-gray-300 dark:bg-gray-600"></div>
                
                <div className="flex items-center gap-2"><span className="font-bold text-gray-700 dark:text-gray-300 text-sm">등급:</span>{['all', '그린', '퍼플'].map(f => <FilterBtn key={f} active={filterLevel===f} label={f==='all'?'전체':f} onClick={()=>setFilterLevel(f)}/>)}</div>
                
                <div className="hidden md:block w-px h-5 bg-gray-300 dark:bg-gray-600"></div>
                
                <div className="flex items-center gap-2"><span className="font-bold text-gray-700 dark:text-gray-300 text-sm">서비스:</span>{['all', 'phone', 'chat'].map(f => <FilterBtn key={f} active={filterType===f} label={f==='all'?'전체':f==='phone'?'전화':'채팅'} onClick={()=>setFilterType(f)}/>)}</div>

                {/* [NEW] 분야 필터 추가 */}
                <div className="hidden md:block w-px h-5 bg-gray-300 dark:bg-gray-600"></div>
                <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-700 dark:text-gray-300 text-sm">분야:</span>
                    {['all', '타로', '사주', '신점'].map(f => (
                        <FilterBtn key={f} active={filterField===f} label={f==='all'?'전체':f} onClick={()=>setFilterField(f)}/>
                    ))}
                </div>

            </div>
            <div className="flex gap-2">
                <button onClick={()=>setShowHistoryModal(true)} className="flex items-center gap-1 bg-green-600 text-white px-3 py-1.5 rounded text-sm font-bold hover:bg-green-700 transition shadow-sm"><FileSpreadsheet size={16}/> 이력 붙여넣기</button>
                <button onClick={()=>{if(confirm('모든 광고 이력을 초기화하시겠습니까?')) setHistory({})}} className="flex items-center gap-1 bg-red-100 text-red-600 px-3 py-1.5 rounded text-sm font-bold hover:bg-red-200 transition border border-red-200"><RotateCcw size={16}/> 이력 초기화</button>
            </div>
        </div>

        <div className="overflow-y-auto pr-2 flex-1 space-y-6">
            {manualAdData && (filterSource === 'all' || filterSource === 'manual') && !manualData.length && (
               filterSource === 'manual' ? (
                   <div className="h-full flex flex-col items-center justify-center p-10 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
                       <FilePlus size={48} className="text-gray-300 mb-4" />
                       <h3 className="text-lg font-bold text-gray-600 dark:text-gray-300 mb-2">개별 상담사 명단이 없습니다.</h3>
                       <div className="w-full max-w-md"><UploadBox label="📂 개별 엑셀 파일 업로드" fileData={manualAdData} onUpload={onUploadManual} onPaste={()=>{}} color="green" /></div>
                   </div>
               ) : null
            )}

            {manualData.length > 0 && (
                <div>
                    <div className="flex justify-between items-center mb-3 pl-1">
                        <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400">📂 개별 추가된 상담사 ({manualData.length}명)</h3>
                        <button onClick={onResetManual} className="text-xs text-red-500 hover:underline">개별 명단 초기화</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{manualData.map((r, i) => renderCard(r, `manual-${i}`, true))}</div>
                    <div className="my-6 border-b border-dashed border-gray-300 dark:border-gray-700"></div>
                </div>
            )}

            {regularData.length > 0 && (
                <div>
                    {manualData.length > 0 && <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-3 pl-1">📋 일반 상담사 ({regularData.length}명)</h3>}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{regularData.map((r, i) => renderCard(r, i, false))}</div>
                </div>
            )}
            
            {!manualAdData && filteredData.length === 0 && filterSource === 'manual' && (
                 <div className="h-full flex flex-col items-center justify-center p-10 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
                    <FilePlus size={48} className="text-gray-300 mb-4" />
                    <h3 className="text-lg font-bold text-gray-600 dark:text-gray-300 mb-2">개별 상담사 명단이 없습니다.</h3>
                    <div className="w-full max-w-md"><UploadBox label="📂 개별 엑셀 파일 업로드" fileData={manualAdData} onUpload={onUploadManual} onPaste={()=>{}} color="green" /></div>
                </div>
            )}
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
      <HistoryPasteModal isOpen={showHistoryModal} onClose={()=>setShowHistoryModal(false)} onConfirm={handleHistoryUpdate} />
    </div>
  );
};

export default AdManager;