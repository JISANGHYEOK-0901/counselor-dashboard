import React from 'react';
import { UserPlus, AlertTriangle } from 'lucide-react';

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

export default RevenuePage;