// src/components/DashboardView.jsx
import React, { useState, useMemo } from 'react';
import { Maximize2, X, Sparkles, Search, RotateCcw, MessageCircle, Settings, Save } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getFilterCondition } from '../utils/aiSearch';
import MessageModal from './MessageModal';

const ISSUE_LABELS = { 'A': 'A 접속시간', 'B': 'B 정산금액', 'C': 'C 부재중', 'D': 'D 후기', 'C(월간부재)': 'C 월간부재', '시간미달': '시간미달' };

const fmt = (n) => (n || 0).toLocaleString();

// [수정 1] 시간을 초(Seconds) 기준으로 포맷팅 (초 -> 00시간 00분)
const fmtTime = (s) => {
  if (!s) return '0시간 0분';
  const h = Math.floor(s / 3600); // 3600초 = 1시간
  const m = Math.floor((s % 3600) / 60); // 나머지 초를 분으로
  return `${h}시간 ${m}분`;
};

const fmtRate = (n) => (n || 0).toFixed(1) + '%';

const ChartComponent = ({ dataset, chartType, isMonthly, height=300 }) => (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={dataset} margin={{top:20, right:30, left:20, bottom:5}}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="nick" tick={{fontSize:14}} interval={0} />
          {/* [수정 2] 차트 Y축: 초 -> 시간 (나누기 3600) */}
          <YAxis tickFormatter={(val) => chartType==='revenue' ? `${val/10000}만` : `${Math.floor(val/3600)}시간`} tick={{fontSize:12}} />
          <Tooltip 
              formatter={(val, name) => [chartType==='revenue' ? fmt(val)+'원' : fmtTime(val), name]}
              labelStyle={{color:'black', fontSize: '14px'}}
          />
          <Legend wrapperStyle={{fontSize: '14px'}}/>
          <Bar dataKey={chartType==='revenue'?'prevRev':'prevTime'} fill="#e5e7eb" name={isMonthly ? "지난달" : "지난주"} radius={[4,4,0,0]} />
          <Bar dataKey={chartType==='revenue'?'curRev':'curTime'} fill={chartType==='revenue'?"#4f46e5":"#10b981"} name={isMonthly ? "이번달" : "이번주"} radius={[4,4,0,0]} />
      </BarChart>
    </ResponsiveContainer>
);

const DashboardView = ({ data, memo, setMemo, isMonthly }) => {
  const [chartType, setChartType] = useState('revenue');
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [filterCode, setFilterCode] = useState(null);

  const [showSettings, setShowSettings] = useState(false);
  const [thresholds, setThresholds] = useState({
    missed: 10,     
    unanswered: 5,  
    minTime: 30,    // 기본 30시간
    revDrop: 10     
  });

  const [isMsgModalOpen, setIsMsgModalOpen] = useState(false);
  const [selectedMsgCounselor, setSelectedMsgCounselor] = useState(null);

  const handleOpenMsg = (row) => {
    setSelectedMsgCounselor(row);
    setIsMsgModalOpen(true);
  };

  const renderDelta = (val, type) => {
    if (!val || val === 0) return null;
    const isPos = val > 0;
    const color = isPos ? 'text-blue-600' : 'text-red-600';
    const sign = isPos ? '+' : '-';
    const absVal = Math.abs(val);
    let text = type === 'time' ? `${sign}${fmtTime(absVal)}` : `${sign}${absVal.toLocaleString()}원`;
    return <div className={`text-xs ${color}`}>{text}</div>;
  };

  const recalculatedData = useMemo(() => {
    return data.map(row => {
      if (row.status === 'blind') {
        return { ...row, issues: [] };
      }

      const newIssues = [];
      const { missed, unanswered, minTime, revDrop } = thresholds;

      if (row.curMissed >= missed) newIssues.push('C');
      if (row.unanswered >= unanswered) newIssues.push('D');

      // [수정 3] 이슈 계산: 초 -> 시간 (나누기 3600)
      const curTimeHour = row.curTime / 3600; 
      
      if (row.status !== 'new' && curTimeHour < minTime) {
        newIssues.push('A');
      }

      const prevRev = row.prevRev || 0;
      const curRev = row.curRev || 0;
      if (row.status !== 'new' && prevRev > 0 && ((prevRev - curRev) / prevRev >= (revDrop / 100))) newIssues.push('B');

      return { ...row, issues: newIssues };
    });
  }, [data, thresholds]);

  const filteredData = useMemo(() => {
      let result = [...recalculatedData];
      if (filterCode) {
        try {
            const filterFn = new Function('item', `return ${filterCode}`);
            result = result.filter(item => filterFn(item));
        } catch (e) {
            console.error("Filter Execution Error:", e);
        }
      }
      return result;
  }, [recalculatedData, filterCode]);

  const sortedData = useMemo(() => {
      return [...filteredData].sort((a, b) => {
          const valA = chartType === 'revenue' ? a.curRev : a.curTime;
          const valB = chartType === 'revenue' ? b.curRev : b.curTime;
          return valB - valA;
      });
  }, [filteredData, chartType]);

  const top10Data = useMemo(() => sortedData.slice(0, 10), [sortedData]);

  const handleAiSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    const code = await getFilterCondition(searchQuery);
    if(code) setFilterCode(code);
    setIsSearching(false);
  };

  const resetSearch = () => {
      setSearchQuery('');
      setFilterCode(null);
  };

const handleKeyDown = (e) => {
  // 'Enter' 키가 눌렸을 때만! 그리고 한글 조합 중(isComposing)이 아닐 때만 실행
  if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
    e.preventDefault(); // 폼 제출 등 기본 동작 방지
    handleAiSearch(e.target.value);
  }
};

  const handleSettingChange = (key, val) => {
    setThresholds(prev => ({ ...prev, [key]: Number(val) }));
  };

  return (
    <div>
      {/* 상단 검색 및 설정 영역 */}
      <div className="mb-6 bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex items-center gap-3 shadow-sm">
        <div className="bg-white p-2 rounded-full text-indigo-600 shadow-sm">
            <Sparkles size={20} />
        </div>
        <div className="flex-1">
            <h4 className="text-xs font-bold text-indigo-800 mb-1">AI 자연어 검색</h4>
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <input 
                        type="text" 
                        className="w-full border border-indigo-200 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        placeholder='예: "매출 100만원 이상인 사람"'
                        value={searchQuery}
                        onChange={(e)=>setSearchQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isSearching}
                    />
                    <Search className="absolute left-3 top-2.5 text-indigo-300" size={16} />
                </div>
                <button 
                    onClick={handleAiSearch} 
                    disabled={isSearching}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-indigo-700 transition disabled:bg-indigo-300"
                >
                    {isSearching ? '분석 중...' : '검색'}
                </button>
                {filterCode && (
                    <button onClick={resetSearch} className="bg-white text-gray-500 border px-3 rounded-lg hover:bg-gray-50 transition" title="검색 초기화">
                        <RotateCcw size={18}/>
                    </button>
                )}
                
                <button 
                  onClick={() => setShowSettings(true)}
                  className="bg-white text-gray-600 border border-gray-300 px-3 rounded-lg hover:bg-gray-50 transition flex items-center gap-1 font-bold"
                  title="이슈 기준 설정"
                >
                  <Settings size={18} />
                </button>
            </div>
        </div>
      </div>

      {/* 설정 모달 */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-96 shadow-2xl animate-fade-in-up">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h3 className="font-bold text-lg flex items-center gap-2"><Settings size={20}/> 이슈 기준 설정</h3>
              <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-600"><X size={24}/></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">📞 C: 부재중 (건수 이상)</label>
                <input type="number" className="w-full border p-2 rounded" value={thresholds.missed} onChange={(e)=>handleSettingChange('missed', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">✍️ D: 미답변 후기 (건수 이상)</label>
                <input type="number" className="w-full border p-2 rounded" value={thresholds.unanswered} onChange={(e)=>handleSettingChange('unanswered', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">⏰ A: 최소 접속시간 (시간 미만)</label>
                <input type="number" className="w-full border p-2 rounded" value={thresholds.minTime} onChange={(e)=>handleSettingChange('minTime', e.target.value)} />
                <p className="text-xs text-gray-400 mt-1">예: 30 입력 시, 30시간 미만 접속자에게 이슈 표시</p>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">📉 B: 매출 하락 (% 이상)</label>
                <input type="number" className="w-full border p-2 rounded" value={thresholds.revDrop} onChange={(e)=>handleSettingChange('revDrop', e.target.value)} />
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button onClick={() => setShowSettings(false)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700 flex items-center gap-2">
                <Save size={16}/> 설정 저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 차트 영역 */}
      <div className="mb-8 p-4 border rounded-xl bg-white shadow-sm">
        <div className="flex justify-between items-center mb-4">
            <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
                <button onClick={()=>setChartType('revenue')} className={`px-4 py-2 text-sm font-bold rounded-md transition ${chartType==='revenue'?'bg-white shadow text-indigo-600':'text-gray-500'}`}>💰 정산금액</button>
                <button onClick={()=>setChartType('time')} className={`px-4 py-2 text-sm font-bold rounded-md transition ${chartType==='time'?'bg-white shadow text-green-600':'text-gray-500'}`}>⏰ 접속시간</button>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-500">
                    총 {filteredData.length}명 표시됨
                </span>
                <button onClick={()=>setShowModal(true)} className="text-sm text-gray-500 hover:text-indigo-600 flex items-center gap-1 font-bold border px-3 py-1.5 rounded hover:bg-gray-50 transition"><Maximize2 size={16}/> 전체보기</button>
            </div>
        </div>
        <div className="h-72 w-full">
            <ChartComponent dataset={top10Data} chartType={chartType} isMonthly={isMonthly} />
        </div>
      </div>

      {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-10">
              <div className="bg-white rounded-xl w-full h-full max-w-7xl p-6 flex flex-col shadow-2xl">
                  <div className="flex justify-between items-center mb-4 border-b pb-2">
                      <h3 className="font-bold text-xl flex items-center gap-2">
                          {chartType==='revenue' ? <span className="text-indigo-600">💰 정산금액</span> : <span className="text-green-600">⏰ 접속시간</span>} 
                          전체 상담사 비교
                      </h3>
                      <button onClick={()=>setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition"><X size={28}/></button>
                  </div>
                  <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
                      <div style={{ width: `${Math.max(100, sortedData.length * 60)}px`, height: '100%' }}>
                          <ChartComponent dataset={sortedData} chartType={chartType} isMonthly={isMonthly} height="100%" />
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* 테이블 영역 */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-center whitespace-nowrap border-collapse table-fixed">
          <thead className="bg-gray-100 text-gray-700 font-bold uppercase sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="p-3 w-28 sticky left-0 bg-gray-100 border-r z-20">닉네임</th>
              <th className="p-3 w-24">카테고리</th>
              <th className="p-3 w-24">단계</th>
              <th className="p-3 w-20">레벨</th>
              <th className="p-3 bg-blue-50 w-32">접속시간</th>
              <th className="p-3 bg-blue-50 w-24">접속증감률</th>
              <th className="p-3 bg-blue-50 w-32">정산금액</th>
              <th className="p-3 bg-blue-50 w-24">상담료증감률</th>
              <th className="p-3 w-24">미작성후기</th>
              <th className="p-3 w-20">부재중</th>
              <th className="p-3 text-left w-80">이슈/비고</th>
              <th className="p-3 w-24">관리</th> 
              <th className="p-3 min-w-[350px]">메모</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {filteredData.map((row, idx) => {
              const timeColor = row.timeRate < 0 ? 'text-red-600' : 'text-blue-600';
              const revColor = row.revRate < 0 ? 'text-red-600' : 'text-blue-600';
              let rowClass = 'hover:bg-gray-50';
              let stickyClass = 'bg-white';
              if (row.status === 'blind') { rowClass = 'bg-red-50 hover:bg-red-100'; stickyClass = 'bg-red-50'; } 
              else if (row.status === 'new') { rowClass = 'bg-yellow-50 hover:bg-yellow-100'; stickyClass = 'bg-yellow-50'; }

              return (
                  <tr key={idx} className={rowClass}>
                    <td className={`p-3 font-bold sticky left-0 border-r z-10 text-gray-800 ${stickyClass}`}>{row.nick}</td>
                    <td className="p-3">{row.category}</td>
                    <td className="p-3">{row.levelCat}</td>
                    <td className="p-3">{row.level}</td>
                    <td className="p-3"><div className="font-medium">{fmtTime(row.curTime)}</div>{renderDelta(row.timeDelta, 'time')}</td>
                    <td className={`p-3 ${timeColor}`}>{fmtRate(row.timeRate * 100)}</td>
                    <td className="p-3"><div className="font-medium">{fmt(row.curRev)}</div>{renderDelta(row.revDelta, 'money')}</td>
                    <td className={`p-3 ${revColor}`}>{fmtRate(row.revRate * 100)}</td>
                    <td className={`p-3 font-bold ${row.unanswered > 0 ? 'text-red-600' : 'text-gray-400'}`}>{row.unanswered}</td>
                    <td className="p-3">{row.curMissed}</td>
                    
                    <td className="p-3 text-left">
                      <div className="flex flex-col gap-1 items-start">
                        {row.remarks!=='-' && <span className="text-gray-600 bg-white border px-2 py-0.5 rounded text-xs font-medium">{row.remarks}</span>}
                        {row.issues.map(code => <span key={code} className="px-2 py-0.5 rounded text-xs font-bold border flex items-center gap-1 bg-yellow-50 text-yellow-700 border-yellow-200">{ISSUE_LABELS[code] || code}</span>)}
                      </div>
                    </td>
                    
                    <td className="p-3">
                        <button
                          onClick={() => handleOpenMsg(row)}
                          className={`px-3 py-1.5 rounded text-xs font-bold transition-all border flex items-center justify-center gap-1 w-full
                            ${(row.issues && row.issues.length > 0) || row.status === 'blind' || row.status === 'new'
                              ? 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200 hover:shadow-sm' 
                              : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50'}
                          `}
                        >
                          <MessageCircle size={14} />
                          {(row.issues && row.issues.length > 0) || row.status === 'blind' || row.status === 'new' ? '생성' : '메시지'}
                        </button>
                    </td>

                    <td className="p-3">
                      <input 
                        className="border rounded px-2 py-1.5 w-full bg-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-shadow" 
                        placeholder="특이사항 입력"
                        value={memo[row.nick]||''} 
                        onChange={e=>setMemo({...memo,[row.nick]:e.target.value})} 
                      />
                    </td>
                  </tr>
              );
            })}
            {filteredData.length === 0 && (
                <tr>
                    <td colSpan="13" className="p-10 text-gray-400">
                        검색 조건에 맞는 상담사가 없습니다.
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>

      <MessageModal 
        isOpen={isMsgModalOpen} 
        onClose={() => setIsMsgModalOpen(false)} 
        counselor={selectedMsgCounselor} 
      />
    </div>
  );
};

export default DashboardView;