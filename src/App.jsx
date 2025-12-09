import React, { useState, useEffect } from 'react';
import { RefreshCw, TrendingUp, Trash2, ArrowRightCircle, X, Download, Moon, Sun } from 'lucide-react';
import { readData, processWeeklyAnalysis, processPerformanceReport, processRevenueSummary } from './utils/dataProcessor';
import { generateMonthlyReportExcel } from './utils/excelGenerator';

// 분리된 컴포넌트 임포트
import UploadBox from "./components/UploadBox";
import DashboardView from "./components/DashboardView";
import AdManager from "./components/AdManager";
import RevenuePage from "./components/RevenuePage";
import PerformanceReportTable from "./components/PerformanceReportTable";
import EmptyState from "./components/EmptyState";
import WorkLogPage from "./components/WorkLogPage"; // [추가] 새로 만든 업무일지 페이지

// 🌑 [초강력 다크모드 스타일] 
const GlobalDarkStyle = () => (
  <style>{`
    /* 1. 기본 배경 및 텍스트 색상 반전 (가장 강력한 규칙) */
    .dark body, .dark .min-h-screen {
        background-color: #111827 !important; /* bg-gray-900 */
        color: #f3f4f6 !important;            /* text-gray-100 */
    }

    /* 2. '흰색 배경'을 가진 모든 요소를 어둡게 변경 (테이블, 카드 포함) */
    .dark .bg-white, .dark .bg-gray-50, .dark .bg-gray-100 {
        background-color: #1f2937 !important; /* bg-gray-800 */
        color: #e5e7eb !important;            /* text-gray-200 */
        border-color: #374151 !important;     /* border-gray-700 */
    }

    /* 3. 테이블 강제 적용 (성과보고서 등 다른 탭 해결용) */
    .dark table, .dark thead, .dark tbody, .dark tr, .dark th, .dark td {
        background-color: #1f2937 !important;
        color: #e5e7eb !important;
        border-color: #374151 !important;
    }
    /* 테이블 헤더는 조금 더 어둡게 구분 */
    .dark thead th {
        background-color: #111827 !important; 
    }

    /* 4. 텍스트 색상 강제 조정 (안 보이는 글씨 해결) */
    .dark .text-gray-900, .dark .text-gray-800, .dark .text-gray-700, .dark .text-gray-600 {
        color: #d1d5db !important; /* 밝은 회색으로 변경 */
    }
    .dark .text-black {
        color: #ffffff !important;
    }

    /* 5. 컬러풀한 박스(노랑, 빨강 등)를 은은하게 변경 */
    .dark .bg-yellow-50 { background-color: rgba(120, 53, 15, 0.2) !important; color: #fbbf24 !important; border: 1px solid rgba(251, 191, 36, 0.3) !important; }
    .dark .bg-red-50    { background-color: rgba(127, 29, 29, 0.2) !important; color: #f87171 !important; border: 1px solid rgba(248, 113, 113, 0.3) !important; }
    .dark .bg-blue-50   { background-color: rgba(30, 58, 138, 0.2) !important; color: #60a5fa !important; border: 1px solid rgba(96, 165, 250, 0.3) !important; }
    .dark .bg-green-50  { background-color: rgba(6, 78, 59, 0.2) !important;  color: #34d399 !important; border: 1px solid rgba(52, 211, 153, 0.3) !important; }
    .dark .bg-purple-50 { background-color: rgba(88, 28, 135, 0.2) !important; color: #a78bfa !important; border: 1px solid rgba(167, 139, 250, 0.3) !important; }
    .dark .bg-indigo-50 { background-color: rgba(49, 46, 129, 0.2) !important; color: #818cf8 !important; border: 1px solid rgba(129, 140, 248, 0.3) !important; }

    /* 6. 입력창 및 버튼 스타일 */
    .dark input, .dark textarea, .dark select {
        background-color: #374151 !important; 
        color: #ffffff !important;
        border-color: #4b5563 !important;
    }
    .dark ::placeholder { color: #9ca3af !important; }
    
    /* 7. 스크롤바 다크모드 */
    .dark ::-webkit-scrollbar { width: 10px; height: 10px; }
    .dark ::-webkit-scrollbar-track { background: #111827; }
    .dark ::-webkit-scrollbar-thumb { background: #4b5563; border-radius: 5px; }
    .dark ::-webkit-scrollbar-thumb:hover { background: #6b7280; }
  `}</style>
);

function App() {
  const [persistedData, setPersistedData] = useState(() => JSON.parse(localStorage.getItem('dashboardData')) || { weekly: null, monthly: null, report: null, revSummary: null });
  const [tempFiles, setTempFiles] = useState(() => JSON.parse(localStorage.getItem('rawDataStorage')) || { lastWeek: null, thisWeek: null, lastMonth: null, thisMonth: null });
  
  const [activeTab, setActiveTab] = useState('weekly');
  const [memo, setMemo] = useState(() => JSON.parse(localStorage.getItem('dashboardMemo')) || {});
  const [adHistory, setAdHistory] = useState(() => JSON.parse(localStorage.getItem('adHistory')) || {});
  
  // [추가] 업무일지 데이터 State
  const [workLogs, setWorkLogs] = useState(() => JSON.parse(localStorage.getItem('workLogs')) || {
      remarks: [],
      recruitments: [],
      interviews: []
  });

  const [pasteModal, setPasteModal] = useState({ open: false, target: '' });
  const [targetMonth, setTargetMonth] = useState(new Date().getMonth() + 1);
  
  // 🌑 다크모드 상태 관리
  const [isDark, setIsDark] = useState(false);

  useEffect(() => localStorage.setItem('dashboardData', JSON.stringify(persistedData)), [persistedData]);
  useEffect(() => localStorage.setItem('dashboardMemo', JSON.stringify(memo)), [memo]);
  useEffect(() => localStorage.setItem('adHistory', JSON.stringify(adHistory)), [adHistory]);
  useEffect(() => localStorage.setItem('rawDataStorage', JSON.stringify(tempFiles)), [tempFiles]);
  useEffect(() => localStorage.setItem('workLogs', JSON.stringify(workLogs)), [workLogs]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        setIsDark(true);
        document.documentElement.classList.add('dark');
    } else {
        setIsDark(false);
        document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newMode = !isDark;
    setIsDark(newMode);
    if (newMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
    } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
    }
  };

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

  const moveThisMonthToLast = () => {
      if(!tempFiles.thisMonth) return alert("이동할 '이번달' 데이터가 없습니다.");
      if(!confirm("이번달 데이터를 지난달로 이동하시겠습니까? (이전 지난달 데이터는 덮어씌워집니다)")) return;
      setTempFiles(prev => ({ ...prev, lastMonth: prev.thisMonth, thisMonth: null }));
      alert("이동 완료!");
  };

  const resetAll = () => {
      if(!confirm("모든 데이터를 초기화하시겠습니까?")) return;
      localStorage.clear();
      setPersistedData({ weekly: null, monthly: null, report: null, revSummary: null });
      setTempFiles({ lastWeek: null, thisWeek: null, lastMonth: null, thisMonth: null });
      setMemo({});
      setAdHistory({});
      setWorkLogs({ remarks: [], recruitments: [], interviews: [] }); // [추가] 초기화
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
        newData.monthly = processWeeklyAnalysis(tempFiles.thisMonth.data, last);
        if(tempFiles.lastMonth) newData.report = processPerformanceReport(tempFiles.thisMonth.data, last);
    }
    if (!tempFiles.thisWeek && !tempFiles.thisMonth) return alert("분석할 데이터를 업로드해주세요.");
    setPersistedData(newData);
    alert("분석 완료!");
  };

  const handleDownloadReport = () => {
      if (!tempFiles.thisMonth || !tempFiles.lastMonth) {
          return alert("월말 정산 리포트를 생성하려면 '이번달'과 '지난달' 데이터가 모두 필요합니다.");
      }
      try {
          const processedCurrent = processWeeklyAnalysis(tempFiles.thisMonth.data, tempFiles.lastMonth.data);
          const processedPast = processWeeklyAnalysis(tempFiles.lastMonth.data, []);
          
          // [수정] generateMonthlyReportExcel 호출 시 memo와 workLogs 전달
          generateMonthlyReportExcel(processedCurrent, processedPast, targetMonth, memo, workLogs);
          
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
    { id: 'worklog', label: '📓 업무 일지' }, // [추가]
  ];

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 ${isDark ? 'dark bg-gray-900 text-gray-100' : 'bg-gray-100 text-gray-800'} pb-20`}>
      
      {/* 🚀 전역 스타일 주입 (다크모드일 때만 강력하게 적용) */}
      {isDark && <GlobalDarkStyle />}

      {/* 붙여넣기 모달 */}
      {pasteModal.open && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-xl w-[600px] border dark:border-gray-700">
                  <div className="flex justify-between mb-4">
                      <h3 className="font-bold text-lg">데이터 붙여넣기</h3>
                      <button onClick={()=>setPasteModal({open:false, target:''})}><X/></button>
                  </div>
                  <textarea 
                    id="pasteArea" 
                    className="w-full h-64 border dark:border-gray-600 p-2 text-xs mb-4 bg-gray-50 dark:bg-gray-700 rounded outline-none" 
                    placeholder="구글 시트에서 복사(Ctrl+C) 후 붙여넣기(Ctrl+V)"
                  ></textarea>
                  <button onClick={()=>handlePaste(document.getElementById('pasteArea').value)} className="w-full bg-indigo-600 dark:bg-indigo-700 text-white py-3 rounded font-bold hover:bg-indigo-700 transition">
                    입력하기
                  </button>
              </div>
          </div>
      )}

      {/* 상단 헤더 */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700 p-6 sticky top-0 z-20 transition-colors">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                <TrendingUp /> 상담사 통합 관리 V33
            </h1>
            
            <div className="flex items-center gap-4">
                {/* 다크모드 토글 버튼 */}
                <button 
                  onClick={toggleTheme}
                  className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-yellow-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                  title="테마 변경"
                >
                  {isDark ? <Sun size={20} /> : <Moon size={20} />}
                </button>

                <button onClick={resetAll} className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-3 py-2 rounded font-bold text-xs flex items-center gap-1 hover:bg-red-100 dark:hover:bg-red-900/30 transition">
                    <Trash2 size={14}/> 데이터 초기화
                </button>
                
                <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                    {TABS.map(t => (
                        <button 
                            key={t.id} 
                            onClick={() => setActiveTab(t.id)} 
                            className={`px-4 py-2 text-sm font-bold rounded-md transition 
                                ${activeTab === t.id 
                                    ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-300 shadow-sm' 
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
            </div>
          </div>

          {/* 파일 업로드 및 분석 영역 */}
          {activeTab !== 'ad' && activeTab !== 'worklog' && (
              <div className="flex gap-4 items-stretch">
                {activeTab === 'weekly' ? (
                    <>
                        <UploadBox label="1. 지난주 (선택)" fileData={tempFiles.lastWeek} onUpload={(e)=>handleUpload(e, 'lastWeek')} onPaste={()=>setPasteModal({open:true, target:'lastWeek'})} />
                        <div className="flex flex-col justify-center items-center px-2">
                            <button onClick={moveThisToLast} className="text-gray-400 dark:text-gray-500 hover:text-indigo-600 transition"><ArrowRightCircle size={24} /></button>
                        </div>
                        <UploadBox label="2. 이번주 (필수)" fileData={tempFiles.thisWeek} onUpload={(e)=>handleUpload(e, 'thisWeek')} onPaste={()=>setPasteModal({open:true, target:'thisWeek'})} color="blue" />
                    </>
                ) : (
                    <>
                        <UploadBox label="1. 비교 데이터 (과거)" fileData={tempFiles.lastMonth} onUpload={(e)=>handleUpload(e, 'lastMonth')} onPaste={()=>setPasteModal({open:true, target:'lastMonth'})} />
                        <div className="flex flex-col justify-center items-center px-2">
                            <button onClick={moveThisMonthToLast} className="text-gray-400 dark:text-gray-500 hover:text-indigo-600 transition"><ArrowRightCircle size={24} /></button>
                        </div>
                        <UploadBox label="2. 기준 데이터 (최신)" fileData={tempFiles.thisMonth} onUpload={(e)=>handleUpload(e, 'thisMonth')} onPaste={()=>setPasteModal({open:true, target:'thisMonth'})} color="purple" />
                    </>
                )}
                
                <div className="flex flex-col gap-2 flex-1 min-w-[200px]">
                    <button onClick={runAnalysis} className="flex-1 bg-indigo-600 dark:bg-indigo-700 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 font-bold flex items-center justify-center gap-2 transition shadow-md w-full">
                        <RefreshCw size={20} className="animate-spin-slow" /> <span>분석 실행</span>
                    </button>
                    
                    {activeTab === 'monthly' && (
                        <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 p-2 rounded-lg border border-green-100 dark:border-green-800">
                           <div className="flex items-center gap-1 bg-white dark:bg-gray-700 rounded px-2 py-1 border border-green-200 dark:border-green-700">
                             <input 
                               type="number" 
                               min="1" max="12"
                               className="w-10 text-center font-bold outline-none text-green-700 dark:text-green-400 bg-transparent"
                               value={targetMonth} 
                               onChange={(e) => setTargetMonth(parseInt(e.target.value) || '')}
                             />
                             <span className="text-xs font-bold text-green-700 dark:text-green-400">월</span>
                           </div>
                           <button onClick={handleDownloadReport} className="flex-1 bg-green-600 dark:bg-green-700 text-white rounded-md py-2 hover:bg-green-700 font-bold flex items-center justify-center gap-2 transition shadow-sm text-sm">
                              <Download size={16} /> <span>다운로드</span>
                           </button>
                        </div>
                    )}
                </div>
              </div>
          )}
        </div>
      </div>

      <div className="max-w-full mx-auto p-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm min-h-[600px] p-6 border border-gray-200 dark:border-gray-700 transition-colors">
          {activeTab === 'weekly' && (persistedData.weekly ? <DashboardView data={persistedData.weekly} memo={memo} setMemo={setMemo} isDark={isDark} /> : <EmptyState />)}
          {activeTab === 'monthly' && (persistedData.monthly ? <DashboardView data={persistedData.monthly} memo={memo} setMemo={setMemo} isMonthly isDark={isDark} /> : <EmptyState type="monthly" />)}
          {activeTab === 'ad' && (persistedData.weekly ? <AdManager data={persistedData.weekly} history={adHistory} setHistory={setAdHistory} /> : <EmptyState />)}
          {activeTab === 'revenue' && (persistedData.revSummary ? <RevenuePage summary={persistedData.revSummary} memo={memo} setMemo={setMemo} /> : <EmptyState type="monthly" />)}
          {activeTab === 'report' && (persistedData.report ? <PerformanceReportTable data={persistedData.report} /> : <EmptyState type="monthly" />)}
          {activeTab === 'worklog' && <WorkLogPage workLogs={workLogs} setWorkLogs={setWorkLogs} />}
        </div>
      </div>
    </div>
  );
}

export default App;