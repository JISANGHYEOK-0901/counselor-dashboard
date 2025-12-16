import React, { useState, useMemo } from 'react';
// [수정] Clock 아이콘 추가
import { Copy, XCircle, FileSpreadsheet, X, FilePlus, RotateCcw, Search, Clock } from 'lucide-react';
import { AD_CYCLES } from '../utils/dataProcessor';
import UploadBox from './UploadBox'; 

// ==========================================
// 1. 상수 및 헬퍼 함수
// ==========================================

const ALL_AD_TYPES = [
  '전화(메인)', 
  '전화(타로)', '전화(사주)', '전화(신점)', 
  '채팅(메인)', 
  '채팅(타로)', '채팅(사주)', '채팅(신점)'
];

const fmtYYMMDD = (d) => {
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}.${mm}.${dd}`;
};

const getNextWeekPeriod = (applyDateStr) => {
    if (!applyDateStr) return null;
    const applyDate = new Date(applyDateStr);
    const day = applyDate.getDay(); 
    
    const distToNextMon = day === 0 ? 1 : (8 - day); 

    const startObj = new Date(applyDate);
    startObj.setDate(applyDate.getDate() + distToNextMon);
    
    const endObj = new Date(startObj);
    endObj.setDate(startObj.getDate() + 6); 

    return `${fmtYYMMDD(startObj)}~${fmtYYMMDD(endObj)}`;
};

const toShortDate = (isoStr) => {
    if (!isoStr) return '-';
    const [y, m, d] = isoStr.split('-');
    return `${y.slice(2)}.${m}.${d}`;
};

// ==========================================
// 2. 하위 컴포넌트
// ==========================================

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

const FilterBtn = ({ active, label, onClick }) => (
    <button onClick={onClick} className={`px-4 py-1.5 text-sm rounded-full border transition-colors whitespace-nowrap ${active?'bg-indigo-600 text-white border-indigo-600 dark:bg-indigo-500':'bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600'}`}>{label}</button>
);

// ==========================================
// 3. 메인 컴포넌트: AdManager
// ==========================================
const AdManager = ({ data, history, setHistory, manualAdData, onUploadManual, onResetManual }) => {
  const [filterSource, setFilterSource] = useState('all'); 
  const [filterLevel, setFilterLevel] = useState('all'); 
  const [filterType, setFilterType] = useState('all');   
  const [filterField, setFilterField] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [requests, setRequests] = useState({}); 
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const handleHistoryUpdate = (newHistory) => { setHistory(prev => ({ ...prev, ...newHistory })); };

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

        if (cleanLevelCat === '퍼플' && recordedAdType === '전화(사주)' && nick === '채원') totalCycle = 1;
        if (cleanLevelCat === '퍼플' && recordedSub === '타로' && nick === '해윰' && recordedAdType === '채팅(메인)') totalCycle = 1;

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
      if(!confirm('신청을 취소하고 기록을 삭제하시겠습니까?')) return;
      
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
    const ORDERED_KEYS = ALL_AD_TYPES; 
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

  const getRecentAdInfo = (nick) => {
      const myHistoryKeys = Object.keys(history).filter(k => k.startsWith(nick + '_'));
      if (myHistoryKeys.length === 0) return null;

      myHistoryKeys.sort((a, b) => new Date(history[b]) - new Date(history[a]));
      
      const latestKey = myHistoryKeys[0];
      const applyDateStr = history[latestKey];
      const type = latestKey.split('_')[1]; 
      
      const period = getNextWeekPeriod(applyDateStr); 
      const cleanType = type.replace('(', '').replace(')', '');
      
      return `${period} ${cleanType} 광고`;
  };

  const filteredData = useMemo(() => {
    return data.filter(r => {
        if (filterSource === 'manual' && !r.isManual) return false;
        if (filterSource === 'auto' && r.isManual) return false;
        if(r.adEligibleTypes.length === 0) return false;
        if(filterLevel !== 'all' && !r.levelCat.includes(filterLevel)) return false;
        if(filterType === 'phone' && !r.adEligibleTypes.some(t => t.includes('전화'))) return false;
        if(filterType === 'chat' && !r.adEligibleTypes.some(t => t.includes('채팅'))) return false;
        if(filterField !== 'all' && !r.category.includes(filterField)) return false;
        if(searchQuery && !r.nick.includes(searchQuery)) return false;
        return true;
    });
  }, [data, filterSource, filterLevel, filterType, filterField, searchQuery]);

  return (
    <div className="flex gap-6 h-[700px]">
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* 상단 필터 바 */}
        <div className="mb-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg flex flex-col xl:flex-row gap-4 border border-gray-100 dark:border-gray-700">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 flex-1">
                <div className="flex items-center gap-2"><span className="font-bold text-gray-700 dark:text-gray-300 text-sm">구분:</span>{['all', 'auto', 'manual'].map(f => <FilterBtn key={f} active={filterSource===f} label={f==='all'?'전체':f==='auto'?'일반':'개별'} onClick={()=>setFilterSource(f)}/>)}</div>
                <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 hidden sm:block"></div>
                <div className="flex items-center gap-2"><span className="font-bold text-gray-700 dark:text-gray-300 text-sm">등급:</span>{['all', '그린', '퍼플'].map(f => <FilterBtn key={f} active={filterLevel===f} label={f==='all'?'전체':f} onClick={()=>setFilterLevel(f)}/>)}</div>
                <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 hidden sm:block"></div>
                <div className="flex items-center gap-2"><span className="font-bold text-gray-700 dark:text-gray-300 text-sm">분야:</span>{['all', '타로', '사주', '신점'].map(f => <FilterBtn key={f} active={filterField===f} label={f==='all'?'전체':f} onClick={()=>setFilterField(f)}/>)}</div>
            </div>

            <div className="flex flex-wrap items-center gap-2 justify-end">
                <div className="relative">
                    <input type="text" className="pl-8 pr-3 py-1.5 text-sm border rounded-full w-40 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" placeholder="상담사명 검색" value={searchQuery} onChange={(e)=>setSearchQuery(e.target.value)} />
                    <Search size={14} className="absolute left-2.5 top-2 text-gray-400"/>
                </div>
                <button onClick={()=>setShowHistoryModal(true)} className="flex items-center gap-1 bg-green-600 text-white px-3 py-1.5 rounded-full text-sm font-bold hover:bg-green-700 transition shadow-sm whitespace-nowrap"><FileSpreadsheet size={14}/> 이력 붙여넣기</button>
                <button onClick={()=>{if(confirm('모든 광고 이력을 초기화하시겠습니까?')) setHistory({})}} className="flex items-center gap-1 bg-red-50 text-red-600 px-3 py-1.5 rounded-full text-sm font-bold hover:bg-red-100 transition border border-red-200 whitespace-nowrap"><RotateCcw size={14}/> 초기화</button>
            </div>
        </div>

        {/* 메인 테이블 영역 */}
        <div className="flex-1 overflow-auto border rounded-xl bg-white dark:bg-gray-800 shadow-sm relative scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
             {!manualAdData && filteredData.length === 0 && filterSource === 'manual' ? (
                 <div className="h-full flex flex-col items-center justify-center p-10">
                    <FilePlus size={48} className="text-gray-300 mb-4" />
                    <h3 className="text-lg font-bold text-gray-600 dark:text-gray-300 mb-2">개별 상담사 명단이 없습니다.</h3>
                    <div className="w-full max-w-md"><UploadBox label="📂 개별 엑셀 파일 업로드" fileData={manualAdData} onUpload={onUploadManual} onPaste={()=>{}} color="green" /></div>
                </div>
             ) : (
                <table className="w-full text-sm text-center border-collapse">
                    <thead className="sticky top-0 z-30 bg-gray-100 dark:bg-gray-700 shadow-sm text-gray-700 dark:text-gray-200">
                        <tr>
                            <th className="p-3 sticky left-0 z-40 bg-gray-100 dark:bg-gray-700 border-r dark:border-gray-600 min-w-[220px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">상담사</th>
                            <th className="p-3 min-w-[80px] border-r dark:border-gray-600">등급</th>
                            {ALL_AD_TYPES.map(type => (
                                <th key={type} className="p-3 min-w-[100px] border-r dark:border-gray-600 font-medium whitespace-nowrap">
                                    {type.replace('전화', '📞').replace('채팅', '💬')}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {filteredData.length === 0 ? (
                            <tr><td colSpan={ALL_AD_TYPES.length + 2} className="p-10 text-gray-400">검색 조건에 맞는 상담사가 없습니다.</td></tr>
                        ) : (
                            filteredData.map((row) => {
                                const isPurple = row.levelCat.includes('퍼플');
                                const nameClass = isPurple ? 'text-purple-700 dark:text-purple-300' : 'text-green-700 dark:text-green-300';
                                const recentAdInfo = getRecentAdInfo(row.nick);

                                return (
                                    <tr key={row.nick} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className={`p-3 sticky left-0 z-20 bg-white dark:bg-gray-800 border-r dark:border-gray-600 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] text-left pl-4 group`}>
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-base dark:text-gray-100 truncate max-w-[80px]">{row.nick}</span>
                                                    
                                                    {/* [수정] 이력 표시 디자인 개선 (밋밋하지 않게) */}
                                                    {recentAdInfo && (
                                                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 bg-indigo-50 dark:text-indigo-300 dark:bg-indigo-900/40 border border-indigo-100 dark:border-indigo-700 px-2 py-0.5 rounded-md shadow-sm whitespace-nowrap">
                                                            <Clock size={11} className="shrink-0"/>
                                                            {recentAdInfo}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className={`text-xs ${nameClass}`}>{row.category}</span>
                                            </div>
                                        </td>
                                        
                                        <td className="p-3 border-r dark:border-gray-600 text-gray-500 dark:text-gray-400 text-xs">
                                            {row.levelCat}<br/>{row.level}
                                        </td>
                                        
                                        {ALL_AD_TYPES.map(type => {
                                            const isEligible = row.adEligibleTypes.includes(type);
                                            const historyKey = `${row.nick}_${type}`;
                                            const lastDate = history[historyKey];

                                            if (!isEligible) {
                                                return <td key={type} className="bg-gray-50 dark:bg-gray-900/40 border-r dark:border-gray-600"></td>;
                                            }

                                            const status = getStatus(row.nick, row.levelCat, type);
                                            const isCool = status.status === 'cool';
                                            
                                            if (isCool) {
                                                return (
                                                    <td key={type} className="p-2 border-r dark:border-gray-600">
                                                        <div className="flex flex-col items-center justify-center gap-1">
                                                            <span className="text-xs text-red-500 font-bold bg-red-50 dark:bg-red-900/30 px-2 py-1 rounded w-full whitespace-nowrap">
                                                                {status.msg}
                                                            </span>
                                                            {status.key && (
                                                                <button onClick={()=>handleCancel(row.nick, type, status.key)} className="text-gray-300 hover:text-red-500 transition mt-1">
                                                                    <XCircle size={14}/>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                );
                                            }

                                            return (
                                                <td key={type} className="p-2 border-r dark:border-gray-600">
                                                    <button 
                                                        onClick={() => handleApply(row.nick, row.levelCat, type)}
                                                        className="w-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 dark:hover:text-white border border-indigo-200 dark:border-indigo-800 py-1.5 rounded font-bold text-xs transition-all shadow-sm"
                                                    >
                                                        신청
                                                    </button>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
             )}
        </div>
      </div>

      <div className="w-80 shrink-0 h-full">
        <div className="border rounded-xl shadow-lg bg-white dark:bg-gray-800 p-5 h-full flex flex-col border-indigo-100 dark:border-gray-700 transition-colors">
            <h3 className="font-bold mb-4 flex items-center gap-2 text-gray-800 dark:text-gray-100 text-base"><Copy size={20} className="text-indigo-600 dark:text-indigo-400"/> 신청서 자동 생성</h3>
            
            <div className="flex-1 relative mb-4">
                <textarea className="w-full h-full border rounded p-3 text-sm font-mono bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-gray-700 dark:text-gray-200 leading-relaxed border-gray-200 dark:border-gray-700" readOnly value={generateRequestText()} />
            </div>

            <div className="flex gap-3">
                <button onClick={()=>{navigator.clipboard.writeText(generateRequestText()); alert("복사되었습니다!")}} className="flex-1 bg-green-600 text-white py-2.5 rounded hover:bg-green-700 font-bold text-sm shadow-sm transition dark:bg-green-700 dark:hover:bg-green-600">전체 복사</button>
                <button onClick={()=>setRequests({})} className="flex-1 bg-gray-100 text-gray-600 py-2.5 rounded hover:bg-gray-200 font-bold text-sm transition dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">초기화</button>
            </div>
            
            <div className="mt-4 text-xs text-gray-400 dark:text-gray-500">
                * 테이블에서 [신청] 버튼을 누르면<br/>이곳에 자동으로 텍스트가 생성됩니다.
            </div>
        </div>
      </div>
      <HistoryPasteModal isOpen={showHistoryModal} onClose={()=>setShowHistoryModal(false)} onConfirm={handleHistoryUpdate} />
    </div>
  );
};

export default AdManager;