import React, { useState, useEffect, useRef } from 'react';
import { Upload, CheckCircle, RefreshCw, TrendingUp, BarChart2, Clock, Copy, Filter, Save, AlertTriangle, Clipboard, X, Trash2, ArrowLeftCircle, UserPlus, FileText, Maximize2, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { readData, processWeeklyAnalysis, processMonthlyAnalysis, processPerformanceReport, processRevenueSummary, AD_CYCLES } from './utils/dataProcessor';
import { generateMonthlyReportExcel } from './utils/excelGenerator';

const ISSUE_LABELS = { 'A': 'A 접속시간', 'B': 'B 정산금액', 'C': 'C 부재중', 'D': 'D 후기', 'C(월간부재)': 'C 월간부재', '시간미달': '시간미달' };

function App() {
  const [persistedData, setPersistedData] = useState(() => JSON.parse(localStorage.getItem('dashboardData')) || { weekly: null, monthly: null, report: null, revSummary: null });
  const [tempFiles, setTempFiles] = useState(() => JSON.parse(localStorage.getItem('rawDataStorage')) || { lastWeek: null, thisWeek: null, lastMonth: null, thisMonth: null });
  
  const [activeTab, setActiveTab] = useState('weekly');
  const [memo, setMemo] = useState(() => JSON.parse(localStorage.getItem('dashboardMemo')) || {});
  const [adHistory, setAdHistory] = useState(() => JSON.parse(localStorage.getItem('adHistory')) || {});
  const [pasteModal, setPasteModal] = useState({ open: false, target: '' });

  // [추가] 월 입력을 위한 state (기본값: 현재 달)
  const [targetMonth, setTargetMonth] = useState(new Date().getMonth() + 1);

  useEffect(() => localStorage.setItem('dashboardData', JSON.stringify(persistedData)), [persistedData]);
  useEffect(() => localStorage.setItem('dashboardMemo', JSON.stringify(memo)), [memo]);
  useEffect(() => localStorage.setItem('adHistory', JSON.stringify(adHistory)), [adHistory]);
  useEffect(() => localStorage.setItem('rawDataStorage', JSON.stringify(tempFiles)), [tempFiles]);

  const handleUpload = async (e, key) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const d = await readData(file, 'file');
        setTempFiles(p => ({ ...p, [key]: { data: d, name: file.name } }));
      } catch (err) { alert("오류: " + err.message); }
      e.target.value = null;
    }
  };

  const handlePaste = async (text) => {
      if(!text) return;
      try {
          const d = await readData(text, 'paste');
          setTempFiles(p => ({ ...p, [pasteModal.target]: { data: d, name: '붙여넣은 데이터' } }));
          setPasteModal({ open: false, target: '' });
          alert("데이터가 입력되었습니다!");
      } catch (err) { alert("데이터 인식 실패: " + err.message); }
  };

  const moveThisToLast = () => {
      if(!tempFiles.thisWeek) return alert("이동할 '이번주' 데이터가 없습니다.");
      if(!confirm("이번주 데이터를 지난주로 이동하시겠습니까?")) return;
      setTempFiles(prev => ({ ...prev, lastWeek: prev.thisWeek, thisWeek: null }));
      alert("이동 완료!");
  };

  const resetAll = () => {
      if(!confirm("모든 데이터를 초기화하시겠습니까?")) return;
      localStorage.clear();
      setPersistedData({ weekly: null, monthly: null, report: null, revSummary: null });
      setTempFiles({ lastWeek: null, thisWeek: null, lastMonth: null, thisMonth: null });
      setMemo({});
      setAdHistory({});
      alert("초기화되었습니다.");
  };

  const runAnalysis = () => {
    const newData = { ...persistedData };
    if (tempFiles.thisWeek) {
        newData.weekly = processWeeklyAnalysis(tempFiles.thisWeek.data, tempFiles.lastWeek?.data || []);
    }
    if (tempFiles.thisMonth) {
        const last = tempFiles.lastMonth?.data || [];
        const summary = processRevenueSummary(tempFiles.thisMonth.data, last);
        newData.revSummary = summary;
        newData.monthly = summary.analyzedCurrent;
        if(tempFiles.lastMonth) newData.report = processPerformanceReport(tempFiles.thisMonth.data, last);
    }
    if (!tempFiles.thisWeek && !tempFiles.thisMonth) return alert("분석할 데이터를 업로드해주세요.");
    setPersistedData(newData);
    alert("분석 완료!");
  };

const moveThisMonthToLast = () => {
      if(!tempFiles.thisMonth) return alert("이동할 '이번달' 데이터가 없습니다.");
      if(!confirm("이번달 데이터를 지난달로 이동하시겠습니까? (이전 지난달 데이터는 덮어씌워집니다)")) return;
      setTempFiles(prev => ({ ...prev, lastMonth: prev.thisMonth, thisMonth: null }));
      alert("이동 완료!");
  };

  const handleDownloadReport = () => {
      if (!tempFiles.thisMonth || !tempFiles.lastMonth) {
          return alert("월말 정산 리포트를 생성하려면 '이번달'과 '지난달' 데이터가 모두 필요합니다.");
      }
      try {

          
          const processedCurrent = processWeeklyAnalysis(tempFiles.thisMonth.data, tempFiles.lastMonth.data);
          
          // 지난달 데이터는 그 전달(2달전) 데이터가 없으므로 빈 배열 []로 둡니다 (단순 수치 참조용)
          const processedPast = processWeeklyAnalysis(tempFiles.lastMonth.data, []);

          // 엑셀 생성 함수 호출
          generateMonthlyReportExcel(processedCurrent, processedPast, targetMonth);

          alert("엑셀 파일 다운로드가 시작되었습니다.");
      } catch (e) {
          console.error(e);
          alert("다운로드 중 오류 발생: " + e.message);
      }
  };

  const TABS = [
    { id: 'weekly', label: '📊 주간 대시보드' },
    { id: 'monthly', label: '📅 월간 대시보드' },
    { id: 'report', label: '📝 성과 보고서' },
    { id: 'ad', label: '📢 광고 관리' },
    { id: 'revenue', label: '💰 월매출 비교' },
  ];

  return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-800 pb-20">
      {pasteModal.open && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-xl shadow-xl w-[600px]">
                  <div className="flex justify-between mb-4"><h3 className="font-bold text-lg">데이터 붙여넣기</h3><button onClick={()=>setPasteModal({open:false, target:''})}><X/></button></div>
                  <textarea id="pasteArea" className="w-full h-64 border p-2 text-xs mb-4 bg-gray-50" placeholder="구글 시트에서 복사(Ctrl+C) 후 붙여넣기(Ctrl+V)"></textarea>
                  <button onClick={()=>handlePaste(document.getElementById('pasteArea').value)} className="w-full bg-indigo-600 text-white py-3 rounded font-bold">입력하기</button>
              </div>
          </div>
      )}

      <div className="bg-white shadow-sm border-b p-6 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-indigo-600 flex items-center gap-2"><TrendingUp /> 상담사 통합 관리 V33</h1>
            <div className="flex items-center gap-4">
                <button onClick={resetAll} className="bg-red-50 text-red-600 px-3 py-2 rounded font-bold text-xs flex items-center gap-1 hover:bg-red-100 transition"><Trash2 size={14}/> 데이터 초기화</button>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                {TABS.map(t => (<button key={t.id} onClick={() => setActiveTab(t.id)} className={`px-4 py-2 text-sm font-bold rounded-md transition ${activeTab === t.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}>{t.label}</button>))}
                </div>
            </div>
          </div>
          {activeTab !== 'ad' && (
              <div className="flex gap-4 items-stretch">
                {activeTab === 'weekly' ? (
                    <>
                        <UploadBox label="1. 지난주 (선택)" fileData={tempFiles.lastWeek} onUpload={(e)=>handleUpload(e, 'lastWeek')} onPaste={()=>setPasteModal({open:true, target:'lastWeek'})} />
                        <div className="flex flex-col justify-center items-center px-2"><button onClick={moveThisToLast} className="text-gray-400 hover:text-indigo-600 transition" title="금주 데이터를 지난주로 이동"><ArrowLeftCircle size={24} /></button></div>
                        <UploadBox label="2. 이번주 (필수)" fileData={tempFiles.thisWeek} onUpload={(e)=>handleUpload(e, 'thisWeek')} onPaste={()=>setPasteModal({open:true, target:'thisWeek'})} color="blue" />
                    </>
                ) : (
                    <>
                        <UploadBox label="1. 비교 데이터 (과거)" fileData={tempFiles.lastMonth} onUpload={(e)=>handleUpload(e, 'lastMonth')} onPaste={()=>setPasteModal({open:true, target:'lastMonth'})} />
                       <button onClick={moveThisMonthToLast} className="text-gray-400 hover:text-indigo-600 transition" title="금월 데이터를 전월로 이동"><ArrowLeftCircle size={24} /></button>
                       <UploadBox label="2. 기준 데이터 (최신)" fileData={tempFiles.thisMonth} onUpload={(e)=>handleUpload(e, 'thisMonth')} onPaste={()=>setPasteModal({open:true, target:'thisMonth'})} color="purple" />
                    </>
                )}
                
                <div className="flex flex-col gap-2 flex-1 min-w-[200px]">
                    <button onClick={runAnalysis} className="flex-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold flex items-center justify-center gap-2 transition shadow-md w-full">
                    <RefreshCw size={20} /> <span>분석 실행</span>
                    </button>
                    {activeTab === 'monthly' && (
                        // [수정] 월 입력 및 버튼 변경
                        <div className="flex items-center gap-2 bg-green-50 p-2 rounded-lg border border-green-100">
                           <div className="flex items-center gap-1 bg-white rounded px-2 py-1 border border-green-200">
                             <input 
  type="number" 
  min="1"
  max="12"
  className="w-10 text-center font-bold outline-none text-green-700 bg-transparent"
  value={targetMonth} 
  onChange={(e) => {
    let val = parseInt(e.target.value);
    if (isNaN(val)) val = ''; 
    else if (val > 12) val = 12; // 12보다 크면 12로 고정
    else if (val < 1) val = 1;   // 1보다 작으면 1로 고정
    setTargetMonth(val);
  }}
/>
                              <span className="text-xs font-bold text-green-700">월</span>
                           </div>
                           <button onClick={handleDownloadReport} className="flex-1 bg-green-600 text-white rounded-md py-2 hover:bg-green-700 font-bold flex items-center justify-center gap-2 transition shadow-sm text-sm">
                              <Download size={16} /> <span>상담사매출확인 다운로드</span>
                           </button>
                        </div>
                    )}
                </div>
              </div>
          )}
        </div>
      </div>

      <div className="max-w-full mx-auto p-6">
        <div className="bg-white rounded-xl shadow-sm min-h-[600px] p-6 border border-gray-200">
          {activeTab === 'weekly' && (persistedData.weekly ? <DashboardView data={persistedData.weekly} memo={memo} setMemo={setMemo} /> : <EmptyState />)}
          {activeTab === 'monthly' && (persistedData.monthly ? <DashboardView data={persistedData.monthly} memo={memo} setMemo={setMemo} isMonthly /> : <EmptyState type="monthly" />)}
          {activeTab === 'ad' && (persistedData.weekly ? <AdManager data={persistedData.weekly} history={adHistory} setHistory={setAdHistory} /> : <EmptyState />)}
          {activeTab === 'revenue' && (persistedData.revSummary ? <RevenuePage summary={persistedData.revSummary} memo={memo} setMemo={setMemo} /> : <EmptyState type="monthly" />)}
          {activeTab === 'report' && (persistedData.report ? <PerformanceReportTable data={persistedData.report} /> : <EmptyState type="monthly" />)}
        </div>
      </div>
    </div>
  );
}

const UploadBox = ({ label, fileData, onUpload, onPaste, color='green' }) => {
    const inputRef = useRef(null);
    const isLoaded = !!fileData;
    const theme = isLoaded ? (color === 'blue' ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-100' : color === 'purple' ? 'border-purple-500 bg-purple-50 text-purple-700 ring-2 ring-purple-100' : 'border-green-500 bg-green-50 text-green-700 ring-2 ring-green-100') : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50';
    const handleBoxClick = () => { if (inputRef.current) inputRef.current.click(); };

    return (
        <div onClick={handleBoxClick} className={`flex-1 border-2 border-dashed rounded-lg flex flex-col items-center justify-center h-32 relative transition-all duration-200 cursor-pointer ${theme}`}>
            <div className="flex flex-col items-center justify-center h-full w-full pointer-events-none">
                {isLoaded ? <FileText className="mb-2" size={32}/> : <Upload className="text-gray-400 mb-2" size={28} />}
                <span className="font-bold text-base mb-1">{label}</span>
                {isLoaded ? <div className="flex flex-col items-center"><span className="text-sm font-medium px-3 py-1 bg-white bg-opacity-60 rounded shadow-sm truncate max-w-[180px]">{fileData.name}</span><span className="text-xs mt-1 text-gray-500 underline">클릭하여 파일 변경</span></div> : <span className="text-sm text-gray-500">클릭하여 파일 업로드</span>}
            </div>
            <input ref={inputRef} type="file" className="hidden" onChange={onUpload} onClick={(e) => { e.target.value = null; }} accept=".xlsx, .xls" />
            {!isLoaded && <button onClick={(e) => { e.stopPropagation(); onPaste(); }} className="absolute bottom-3 right-3 bg-white border border-gray-300 px-3 py-1.5 rounded text-xs hover:bg-gray-100 shadow-sm text-gray-600 font-bold transition z-10 pointer-events-auto">구글시트</button>}
        </div>
    );
};

const DashboardView = ({ data, memo, setMemo, isMonthly }) => {
  const [chartType, setChartType] = useState('revenue');
  const [showModal, setShowModal] = useState(false);

  const fmt = (n) => (n || 0).toLocaleString();
  const fmtTime = (m) => `${Math.floor(m/60)}h ${m%60}m`;
  const fmtRate = (n) => (n || 0).toFixed(1) + '%';

  const renderDelta = (val, type) => {
    if (!val || val === 0) return null;
    const isPos = val > 0;
    const color = isPos ? 'text-blue-600' : 'text-red-600';
    const sign = isPos ? '+' : '';
    let text = type === 'time' ? `${sign}${fmtTime(val)}` : `${sign}${Math.abs(val).toLocaleString()}원`;
    return <div className={`text-xs ${color}`}>{text}</div>;
  };

  const sortedData = [...data].sort((a, b) => {
      const valA = chartType === 'revenue' ? a.curRev : a.curTime;
      const valB = chartType === 'revenue' ? b.curRev : b.curTime;
      return valB - valA;
  });
  const top10Data = sortedData.slice(0, 10);

  const ChartComponent = ({ dataset, height=300 }) => (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={dataset} margin={{top:20, right:30, left:20, bottom:5}}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="nick" tick={{fontSize:14}} interval={0} />
            <YAxis tickFormatter={(val) => chartType==='revenue' ? `${val/10000}만` : `${Math.floor(val/60)}h`} tick={{fontSize:12}} />
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

  return (
    <div>
      <div className="mb-8 p-4 border rounded-xl bg-white shadow-sm">
        <div className="flex justify-between items-center mb-4">
            <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
                <button onClick={()=>setChartType('revenue')} className={`px-4 py-2 text-sm font-bold rounded-md transition ${chartType==='revenue'?'bg-white shadow text-indigo-600':'text-gray-500'}`}>💰 정산금액</button>
                <button onClick={()=>setChartType('time')} className={`px-4 py-2 text-sm font-bold rounded-md transition ${chartType==='time'?'bg-white shadow text-green-600':'text-gray-500'}`}>⏰ 접속시간</button>
            </div>
            <button onClick={()=>setShowModal(true)} className="text-sm text-gray-500 hover:text-indigo-600 flex items-center gap-1 font-bold border px-3 py-1.5 rounded hover:bg-gray-50 transition"><Maximize2 size={16}/> 전체보기</button>
        </div>
        <div className="h-72 w-full">
            <ChartComponent dataset={top10Data} />
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
                          <ChartComponent dataset={sortedData} height="100%" />
                      </div>
                  </div>
              </div>
          </div>
      )}

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
              <th className="p-3 min-w-[350px]">메모</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {data.map((row, idx) => {
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
                    <td className="p-3"><input className="border rounded px-2 py-1.5 w-full bg-white text-sm" value={memo[row.nick]||''} onChange={e=>setMemo({...memo,[row.nick]:e.target.value})} /></td>
                  </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const PerformanceReportTable = ({ data }) => {
    const copyToClipboard = () => {
        const headers = ['분야', '단계', '단계', '상담사', '2달전매출', '1달전매출', '매출증감', '2달전시간', '1달전시간', '시간증감', '사유', '목표'];
        const rows = data.map(r => [
            r.category, r.levelCat, r.level, r.nick,
            r.prevRev + '원', r.curRev + '원', (r.revRate*100).toFixed(1)+'%',
            `${Math.floor(r.prevTime/60)}시간 ${r.prevTime%60}분`, `${Math.floor(r.curTime/60)}시간 ${r.curTime%60}분`, (r.timeRate*100).toFixed(1)+'%',
            r.reason, r.goal
        ].join('\t')).join('\n');
        navigator.clipboard.writeText(headers.join('\t')+'\n'+rows);
        alert("복사완료!");
    };

    if(!data || data.length === 0) return <div className="text-center py-20 text-gray-500 text-base">데이터 없음</div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-xl">📝 성과 분석 보고서</h3><button onClick={copyToClipboard} className="bg-green-600 text-white px-5 py-2.5 rounded font-bold text-base hover:bg-green-700 transition">엑셀 복사</button></div>
            <div className="overflow-x-auto border rounded-lg max-h-[600px]">
                <table className="w-full text-sm text-center border-collapse">
                    <thead className="bg-gray-100 sticky top-0 shadow-sm text-gray-700">
                        <tr>{['분야', '단계', '단계', '상담사', '2달전 매출', '1달전 매출', '매출증감', '2달전 시간', '1달전 시간', '시간증감', '사유', '목표'].map((h, i)=><th key={i} className="p-3 border whitespace-nowrap">{h}</th>)}</tr>
                    </thead>
                    <tbody>
                    {data.map((r, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                            <td className="p-3 border">{r.category}</td><td className="p-3 border">{r.levelCat}</td><td className="p-3 border">{r.level}</td><td className="p-3 border font-bold">{r.nick}</td>
                            <td className="p-3 border">{(r.prevRev||0).toLocaleString()}원</td>
                            <td className="p-3 border">{(r.curRev||0).toLocaleString()}원</td>
                            <td className={`p-3 border ${r.revRate>0?'text-blue-600':'text-red-600'}`}>{r.revRate>0?'+':''}{(r.revRate*100).toFixed(1)}%</td>
                            <td className="p-3 border">{Math.floor((r.prevTime||0)/60)}시간 {(r.prevTime||0)%60}분</td>
                            <td className="p-3 border">{Math.floor((r.curTime||0)/60)}시간 {(r.curTime||0)%60}분</td>
                            <td className={`p-3 border ${r.timeRate>0?'text-blue-600':'text-red-600'}`}>{r.timeRate>0?'+':''}{(r.timeRate*100).toFixed(1)}%</td>
                            <td className="p-3 border text-left truncate max-w-xs" title={r.reason}>{r.reason}</td><td className="p-3 border text-left truncate max-w-xs" title={r.goal}>{r.goal}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const RevenuePage = ({ summary, memo, setMemo }) => {
    const fmt = (n) => n?.toLocaleString() || 0;
    return (
        <div className="p-4">
            <div className="grid grid-cols-4 gap-4 mb-8">
                <div className="bg-blue-50 p-5 rounded border border-blue-100"><div className="text-sm text-blue-600 font-bold mb-1">이번달 매출</div><div className="text-2xl font-bold">{fmt(summary.totalRevThis)}원</div><div className={`text-sm mt-1 ${summary.growth>=0?'text-blue-600':'text-red-600'}`}>{summary.growth>0?'+':''}{summary.growth.toFixed(1)}%</div></div>
                <div className="bg-gray-50 p-5 rounded border"><div className="text-sm text-gray-500 font-bold mb-1">지난달 매출</div><div className="text-2xl font-bold text-gray-700">{fmt(summary.totalRevLast)}원</div></div>
                <div className="bg-indigo-50 p-5 rounded border border-indigo-100 col-span-2"><div className="text-sm text-indigo-600 font-bold mb-3">인원 현황</div><div className="flex justify-between text-base"><span>기존: <b>{summary.existingCount}</b></span><span>신규: <b className="text-blue-600">{summary.newCount}</b></span><span>블라인드: <b className="text-red-500">{summary.blindCount}</b></span></div></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                {summary.newList && summary.newList.length > 0 && (
                    <div className="border rounded-xl p-6 bg-yellow-50 border-yellow-100">
                        <h4 className="font-bold text-yellow-700 mb-4 text-base flex items-center gap-2"><UserPlus size={18}/> 신규 상담사</h4>
                        <div className="flex flex-col gap-3">{summary.newList.map(n => (<div key={n.nick} className="bg-white p-4 rounded-lg border border-yellow-200 shadow-sm"><div className="text-sm font-bold text-gray-700 mb-1">{n.info}</div><div className="text-sm text-blue-500 mb-2">금월 매출: {fmt(n.curRev)}원</div><input className="border border-gray-200 rounded px-2 py-1.5 text-sm w-full bg-gray-50 focus:bg-white transition" placeholder="메모..." value={memo[n.nick]||''} onChange={e=>setMemo({...memo,[n.nick]:e.target.value})} /></div>))}</div>
                    </div>
                )}
                
                {summary.blindList.length > 0 && (
                    <div className="border rounded-xl p-6 bg-red-50 border-red-100">
                        <h4 className="font-bold text-red-700 mb-4 text-base flex items-center gap-2"><AlertTriangle size={18}/> 블라인드(이탈) 상담사</h4>
                        <div className="flex flex-col gap-3">{summary.blindList.map(b => (<div key={b.nick} className="bg-white p-4 rounded-lg border border-red-200 shadow-sm"><div className="text-sm font-bold text-gray-700 mb-1">{b.info}</div><div className="text-sm text-red-500 mb-2">전월 매출: {fmt(b.prevRev)}원</div><input className="border border-gray-200 rounded px-2 py-1.5 text-sm w-full bg-gray-50 focus:bg-white transition" placeholder="메모..." value={memo[b.nick]||''} onChange={e=>setMemo({...memo,[b.nick]:e.target.value})} /></div>))}</div>
                    </div>
                )}
            </div>
        </div>
    );
};

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

const EmptyState = ({ type }) => <div className="text-center py-20 text-gray-400">데이터를 업로드해주세요.</div>;

export default App;