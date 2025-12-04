import React from 'react';

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

export default PerformanceReportTable;