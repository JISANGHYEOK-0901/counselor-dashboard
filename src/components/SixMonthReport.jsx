import React, { useState, useMemo, useEffect } from 'react';
import { Download, RefreshCw, Trash2, Info } from 'lucide-react';
import { readData, aggregateData } from '../utils/dataProcessor';
import { generateSixMonthExcel } from '../utils/excelGenerator';
import UploadBox from './UploadBox';

// [수정] filesStore: 전체 파일 객체 { '1': [], '2': [] }
const SixMonthReport = ({ filesStore = { '1': Array(6).fill(null), '2': Array(6).fill(null) }, setFilesStore }) => {
    const [year, setYear] = useState(new Date().getFullYear());
    const [half, setHalf] = useState('1'); // 1: 상반기, 2: 하반기
    
    // [수정] 현재 선택된 반기(half)에 해당하는 파일 목록 가져오기
    const files = filesStore[half] || Array(6).fill(null);

    const [processedData, setProcessedData] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // 반기가 변경되면 분석 결과는 초기화 (새로 분석해야 함)
    useEffect(() => {
        setProcessedData(null);
    }, [half]);

    const monthLabels = useMemo(() => {
        const startMonth = half === '1' ? 1 : 7;
        return Array.from({ length: 6 }, (_, i) => `${startMonth + i}월`);
    }, [half]);

    const handleUpload = async (e, index) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            const rawData = await readData(file, 'file');
            
            // 현재 반기의 파일 목록 복사
            const currentHalfFiles = [...files];
            currentHalfFiles[index] = { name: file.name, data: rawData };
            
            // 전체 Store 업데이트
            if (setFilesStore) {
                setFilesStore(prev => ({
                    ...prev,
                    [half]: currentHalfFiles
                }));
            }
        } catch (err) {
            alert(`${index + 1}번째 파일 오류: ${err.message}`);
        }
        e.target.value = null;
    };

    const handleReset = () => {
        if (confirm('현재 반기의 데이터를 초기화하시겠습니까?')) {
            if (setFilesStore) {
                setFilesStore(prev => ({
                    ...prev,
                    [half]: Array(6).fill(null) // 현재 반기만 초기화
                }));
            }
            setProcessedData(null);
        }
    };

    const analyzeData = () => {
        const currentFiles = files;
        if (currentFiles.every(f => f === null)) return alert("분석할 파일이 없습니다.");

        setIsProcessing(true);
        setTimeout(() => {
            const counselorMap = {};

            currentFiles.forEach((fileObj, monthIdx) => {
                if (!fileObj) return;
                const dailyData = aggregateData(fileObj.data);
                
                dailyData.forEach(row => {
                    const { nick, realName, category, levelCat, levelStr, curRev } = row;
                    
                    if (!counselorMap[nick]) {
                        counselorMap[nick] = {
                            nick, realName, category, levelCat, level: levelStr,
                            revenues: Array(6).fill(0),
                            totalRev: 0,
                            avgRev: 0,
                            joinIndex: -1
                        };
                    }
                    counselorMap[nick].revenues[monthIdx] = curRev;
                });
            });

            const result = Object.values(counselorMap).map(c => {
                const total = c.revenues.reduce((a, b) => a + b, 0);
                let firstActiveIndex = c.revenues.findIndex(r => r > 0);
                if (firstActiveIndex === -1) firstActiveIndex = 0;
                const activeMonthsCount = 6 - firstActiveIndex;
                const avg = activeMonthsCount > 0 ? Math.floor(total / activeMonthsCount) : 0;

                return {
                    ...c,
                    totalRev: total,
                    avgRev: avg,
                    joinMonth: firstActiveIndex
                };
            }).sort((a, b) => b.totalRev - a.totalRev);

            setProcessedData(result);
            setIsProcessing(false);
        }, 100);
    };

    const handleDownload = () => {
        if (!processedData) return;
        try {
            generateSixMonthExcel(processedData, year, half, monthLabels);
        } catch (e) {
            console.error(e);
            alert("다운로드 중 오류 발생");
        }
    };

    return (
        <div className="p-4 space-y-6">
            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border dark:border-gray-700 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                        <input type="number" value={year} onChange={(e) => setYear(e.target.value)} className="w-20 bg-transparent text-center font-bold outline-none dark:text-white" />
                        <span className="text-sm font-bold text-gray-500 dark:text-gray-400">년</span>
                    </div>
                    <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                        <button onClick={() => setHalf('1')} className={`px-4 py-1.5 text-sm font-bold rounded-md transition ${half === '1' ? 'bg-white dark:bg-gray-600 shadow text-indigo-600 dark:text-indigo-300' : 'text-gray-500 dark:text-gray-400'}`}>상반기</button>
                        <button onClick={() => setHalf('2')} className={`px-4 py-1.5 text-sm font-bold rounded-md transition ${half === '2' ? 'bg-white dark:bg-gray-600 shadow text-indigo-600 dark:text-indigo-300' : 'text-gray-500 dark:text-gray-400'}`}>하반기</button>
                    </div>
                </div>
                
                <div className="flex gap-2">
                    <button onClick={handleReset} className="flex items-center gap-1 px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 rounded-lg font-bold transition text-sm border border-transparent dark:border-red-800">
                        <Trash2 size={16}/> 초기화
                    </button>
                    <button onClick={analyzeData} className="flex items-center gap-1 px-5 py-2 text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-600 rounded-lg font-bold transition shadow-sm text-sm">
                        <RefreshCw size={16} className={isProcessing ? "animate-spin" : ""}/> 데이터 병합 및 분석
                    </button>
                    {processedData && (
                        <button onClick={handleDownload} className="flex items-center gap-1 px-5 py-2 text-white bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 rounded-lg font-bold transition shadow-sm text-sm">
                            <Download size={16}/> 엑셀 다운로드
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {monthLabels.map((label, idx) => (
                    <UploadBox 
                        key={idx} 
                        label={label} 
                        fileData={files && files[idx]} 
                        onUpload={(e) => handleUpload(e, idx)} 
                        onPaste={() => {}} 
                        color="blue"
                    />
                ))}
            </div>

            {processedData && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-hidden animate-fade-in-up">
                    <div className="p-4 border-b dark:border-gray-700 font-bold flex justify-between items-center dark:text-white">
                        <span>📊 {year}년 {half === '1' ? '상반기' : '하반기'} 매출 분석 결과 ({processedData.length}명)</span>
                        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 font-normal">
                            <Info size={14}/>
                            <span>평균 월매출은 첫 매출 발생 월부터 계산됩니다 (중도 입사 반영)</span>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-center border-collapse whitespace-nowrap">
                            <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                                <tr>
                                    <th className="p-3 border-r dark:border-gray-600">분야</th>
                                    <th className="p-3 border-r dark:border-gray-600">등급</th>
                                    <th className="p-3 border-r dark:border-gray-600">활동명</th>
                                    {monthLabels.map(m => <th key={m} className="p-3 border-r dark:border-gray-600 min-w-[80px]">{m}</th>)}
                                    <th className="p-3 border-r dark:border-gray-600 bg-blue-50 dark:bg-blue-900/20">평균 월매출</th>
                                    <th className="p-3 bg-indigo-50 dark:bg-indigo-900/20">총 매출</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-gray-800 dark:text-gray-200">
                                {processedData.map((row, idx) => {
                                    const activeRevs = row.revenues.map((v, i) => ({ val: v, idx: i })).filter(o => o.val > 0);
                                    let maxIdx = -1, minIdx = -1;
                                    
                                    if (activeRevs.length > 0) {
                                        const maxVal = Math.max(...activeRevs.map(o => o.val));
                                        const minVal = Math.min(...activeRevs.map(o => o.val));
                                        maxIdx = activeRevs.find(o => o.val === maxVal)?.idx;
                                        minIdx = activeRevs.find(o => o.val === minVal)?.idx;
                                    }

                                    return (
                                        <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                                            <td className="p-3 border-r dark:border-gray-600">{row.category}</td>
                                            <td className="p-3 border-r dark:border-gray-600">{row.levelCat} {row.level}</td>
                                            <td className="p-3 border-r dark:border-gray-600 font-bold">{row.nick}</td>
                                            {row.revenues.map((rev, i) => {
                                                let cellClass = "p-3 border-r dark:border-gray-600";
                                                if (i < row.joinMonth && rev === 0) {
                                                    cellClass += " bg-gray-50 dark:bg-gray-800 text-gray-300 dark:text-gray-600";
                                                } else {
                                                    if (i === maxIdx) cellClass += " bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 font-bold";
                                                    if (i === minIdx) cellClass += " bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold";
                                                }
                                                return (
                                                    <td key={i} className={cellClass}>
                                                        {(rev || 0).toLocaleString()}
                                                    </td>
                                                );
                                            })}
                                            <td className="p-3 border-r dark:border-gray-600 font-medium bg-blue-50/50 dark:bg-blue-900/10">{(row.avgRev || 0).toLocaleString()}</td>
                                            <td className="p-3 font-bold bg-indigo-50/50 dark:bg-indigo-900/10">{(row.totalRev || 0).toLocaleString()}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SixMonthReport;