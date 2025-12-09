import React from 'react';

const PerformanceReportTable = ({ data }) => {
    
    // 시간 포맷 변환 함수 (초 단위 -> "H시간 M분")
    // dataProcessor에서 넘어온 데이터(r.prevTime, r.curTime)는 '초(second)' 단위입니다.
    const formatTimeStr = (seconds) => {
        if (!seconds) return '0시간 0분';
        const h = Math.floor(seconds / 3600);      // 3600으로 나누어야 시간
        const m = Math.floor((seconds % 3600) / 60); // 남은 초를 60으로 나누어야 분
        return `${h}시간 ${m}분`;
    };

    const copyToClipboard = () => {
        // [수정 1] 헤더 명칭 변경
        const headers = [
            '분야', '단계', '단계', '상담사', 
            '2달전 매출', '1달전 매출', '매출증감', 
            '2달전 접속시간', '1달 전 접속 시간', '시간증감', // <-- 요청하신 명칭 변경 완료
            '사유', '목표'
        ];

        const rows = data.map(r => [
            r.category, r.levelCat, r.level, r.nick,
            (r.prevRev || 0) + '원', 
            (r.curRev || 0) + '원', 
            (r.revRate * 100).toFixed(1) + '%',
            
            // [수정 2] 엑셀 복사 시에도 올바른 시간 계산 적용 (초 단위 기준)
            formatTimeStr(r.prevTime),
            formatTimeStr(r.curTime),
            
            (r.timeRate * 100).toFixed(1) + '%',
            r.reason, r.goal
        ].join('\t')).join('\n');

        navigator.clipboard.writeText(headers.join('\t') + '\n' + rows);
        alert("복사완료!");
    };

    if (!data || data.length === 0) return <div className="text-center py-20 text-gray-500 text-base">데이터 없음</div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-xl">📝 성과 분석 보고서</h3>
                <button onClick={copyToClipboard} className="bg-green-600 text-white px-5 py-2.5 rounded font-bold text-base hover:bg-green-700 transition">
                    엑셀 복사
                </button>
            </div>
            <div className="overflow-x-auto border rounded-lg max-h-[600px]">
                <table className="w-full text-sm text-center border-collapse">
                    <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0 shadow-sm text-gray-700 dark:text-gray-200">
                        <tr>
                            {/* [수정 1] 헤더 명칭 변경 반영 */}
                            {[
                                '분야', '단계', '단계', '상담사', 
                                '2달전 매출', '1달전 매출', '매출증감', 
                                '2달전 접속시간', '1달 전 접속 시간', '시간증감', 
                                '사유', '목표'
                            ].map((h, i) => (
                                <th key={i} className="p-3 border dark:border-gray-600 whitespace-nowrap">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="dark:text-gray-300">
                        {data.map((r, i) => (
                            <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                                <td className="p-3 border dark:border-gray-600">{r.category}</td>
                                <td className="p-3 border dark:border-gray-600">{r.levelCat}</td>
                                <td className="p-3 border dark:border-gray-600">{r.level}</td>
                                <td className="p-3 border dark:border-gray-600 font-bold">{r.nick}</td>
                                
                                <td className="p-3 border dark:border-gray-600">{(r.prevRev || 0).toLocaleString()}원</td>
                                <td className="p-3 border dark:border-gray-600">{(r.curRev || 0).toLocaleString()}원</td>
                                <td className={`p-3 border dark:border-gray-600 ${r.revRate > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
                                    {r.revRate > 0 ? '+' : ''}{(r.revRate * 100).toFixed(1)}%
                                </td>
                                
                                {/* [수정 2] 화면 표시 시간 계산 로직 수정 (/60 -> /3600) */}
                                <td className="p-3 border dark:border-gray-600">{formatTimeStr(r.prevTime)}</td>
                                <td className="p-3 border dark:border-gray-600">{formatTimeStr(r.curTime)}</td>
                                
                                <td className={`p-3 border dark:border-gray-600 ${r.timeRate > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
                                    {r.timeRate > 0 ? '+' : ''}{(r.timeRate * 100).toFixed(1)}%
                                </td>
                                <td className="p-3 border dark:border-gray-600 text-left truncate max-w-xs" title={r.reason}>{r.reason}</td>
                                <td className="p-3 border dark:border-gray-600 text-left truncate max-w-xs" title={r.goal}>{r.goal}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PerformanceReportTable;