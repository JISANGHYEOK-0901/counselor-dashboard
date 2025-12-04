import React, { useState } from 'react';
import { Maximize2, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const ISSUE_LABELS = { 'A': 'A 접속시간', 'B': 'B 정산금액', 'C': 'C 부재중', 'D': 'D 후기', 'C(월간부재)': 'C 월간부재', '시간미달': '시간미달' };

const DashboardView = ({ data, memo, setMemo, isMonthly }) => {
  const [chartType, setChartType] = useState('revenue');
  const [showModal, setShowModal] = useState(false);

  const fmt = (n) => (n || 0).toLocaleString();
  const fmtTime = (m) => `${Math.floor(m/60)}시간 ${m%60}분`;
  const fmtRate = (n) => (n || 0).toFixed(1) + '%';

  const renderDelta = (val, type) => {
    if (!val || val === 0) return null;
    const isPos = val > 0;
    const color = isPos ? 'text-blue-600' : 'text-red-600';
    const sign = isPos ? '+' : '-';
    const absVal = Math.abs(val);

    let text = '';
    if (type === 'time') {
        text = `${sign}${fmtTime(absVal)}`;
    } else {
        text = `${sign}${absVal.toLocaleString()}원`;
    }
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
            <YAxis tickFormatter={(val) => chartType==='revenue' ? `${val/10000}만` : `${Math.floor(val/60)}시간`} tick={{fontSize:12}} />
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

export default DashboardView;