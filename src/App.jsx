import React, { useState, useEffect } from 'react';
import { RefreshCw, TrendingUp, Trash2, ArrowRightCircle, X, Download } from 'lucide-react';
import { readData, processWeeklyAnalysis, processPerformanceReport, processRevenueSummary } from './utils/dataProcessor';
import { generateMonthlyReportExcel } from './utils/excelGenerator';

// 분리된 컴포넌트 임포트
import UploadBox from "./components/UploadBox";
import DashboardView from "./components/DashboardView";
import AdManager from "./components/AdManager";
import RevenuePage from "./components/RevenuePage";
import PerformanceReportTable from "./components/PerformanceReportTable";
import EmptyState from "./components/EmptyState";

function App() {
  const [persistedData, setPersistedData] = useState(() => JSON.parse(localStorage.getItem('dashboardData')) || { weekly: null, monthly: null, report: null, revSummary: null });
  const [tempFiles, setTempFiles] = useState(() => JSON.parse(localStorage.getItem('rawDataStorage')) || { lastWeek: null, thisWeek: null, lastMonth: null, thisMonth: null });
  
  const [activeTab, setActiveTab] = useState('weekly');
  const [memo, setMemo] = useState(() => JSON.parse(localStorage.getItem('dashboardMemo')) || {});
  const [adHistory, setAdHistory] = useState(() => JSON.parse(localStorage.getItem('adHistory')) || {});
  const [pasteModal, setPasteModal] = useState({ open: false, target: '' });

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
        // 월간 분석 시에도 지난달 데이터(last)를 전달하여 신규/기존 구분
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
                        <div className="flex flex-col justify-center items-center px-2"><button onClick={moveThisToLast} className="text-gray-400 hover:text-indigo-600 transition" title="금주 데이터를 지난주로 이동"><ArrowRightCircle size={24} /></button></div>
                        <UploadBox label="2. 이번주 (필수)" fileData={tempFiles.thisWeek} onUpload={(e)=>handleUpload(e, 'thisWeek')} onPaste={()=>setPasteModal({open:true, target:'thisWeek'})} color="blue" />
                    </>
                ) : (
                    <>
                        <UploadBox label="1. 비교 데이터 (과거)" fileData={tempFiles.lastMonth} onUpload={(e)=>handleUpload(e, 'lastMonth')} onPaste={()=>setPasteModal({open:true, target:'lastMonth'})} />
                        <div className="flex flex-col justify-center items-center px-2">
                            <button onClick={moveThisMonthToLast} className="text-gray-400 hover:text-indigo-600 transition" title="금월 데이터를 전월로 이동"><ArrowRightCircle size={24} /></button>
                        </div>
                        <UploadBox label="2. 기준 데이터 (최신)" fileData={tempFiles.thisMonth} onUpload={(e)=>handleUpload(e, 'thisMonth')} onPaste={()=>setPasteModal({open:true, target:'thisMonth'})} color="purple" />
                    </>
                )}
                
                <div className="flex flex-col gap-2 flex-1 min-w-[200px]">
                    <button onClick={runAnalysis} className="flex-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold flex items-center justify-center gap-2 transition shadow-md w-full">
                    <RefreshCw size={20} /> <span>분석 실행</span>
                    </button>
                    {activeTab === 'monthly' && (
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
                                  else if (val > 12) val = 12; 
                                  else if (val < 1) val = 1; 
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

export default App;