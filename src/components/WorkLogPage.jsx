import React, { useState } from 'react';
import { Plus, Trash2, Save, Clipboard, X, Check, Trash } from 'lucide-react';

// --------------------------------------------------------
// 1. 엑셀 붙여넣기 모달 컴포넌트
// --------------------------------------------------------
const PasteModal = ({ isOpen, onClose, onConfirm, title }) => {
    const [text, setText] = useState('');

    const handleParse = () => {
        if (!text.trim()) return onClose();
        
        // 엑셀 데이터 파싱 로직
        // 1. 행 분리 (줄바꿈 기준)
        const rows = text.split('\n').filter(r => r.trim() !== '');
        
        const parsedData = rows.map(row => {
            // 2. 열 분리 (탭 기준)
            const cols = row.split('\t'); 
            return cols.map(c => {
                // 3. 엑셀에서 복사 시 생기는 양끝 따옴표 제거 및 내부 줄바꿈 처리
                let cleanText = c.trim();
                if (cleanText.startsWith('"') && cleanText.endsWith('"')) {
                    cleanText = cleanText.slice(1, -1).replace(/""/g, '"'); // 이중 따옴표 처리
                }
                return cleanText;
            });
        });

        onConfirm(parsedData);
        setText('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-xl w-[600px] border dark:border-gray-700">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg dark:text-gray-100">{title} - 엑셀 붙여넣기</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400"><X /></button>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    엑셀에서 데이터를 드래그하여 복사(Ctrl+C)한 후 아래 상자에 붙여넣기(Ctrl+V) 하세요.
                </div>
                <textarea
                    className="w-full h-64 border dark:border-gray-600 p-3 text-xs mb-4 bg-gray-50 dark:bg-gray-900 rounded outline-none dark:text-white whitespace-pre"
                    placeholder={`데이터를 여기에 붙여넣으세요...`}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                ></textarea>
                <div className="flex gap-2">
                    <button onClick={onClose} className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 rounded font-bold hover:bg-gray-300 transition">
                        취소
                    </button>
                    <button onClick={handleParse} className="flex-1 bg-indigo-600 dark:bg-indigo-700 text-white py-3 rounded font-bold hover:bg-indigo-700 transition flex items-center justify-center gap-2">
                        <Check size={18} /> 데이터 변환 및 추가
                    </button>
                </div>
            </div>
        </div>
    );
};

// --------------------------------------------------------
// 2. 섹션 컴포넌트 (테이블 + 삭제 버튼 + 전체 삭제)
// --------------------------------------------------------
const Section = ({ title, columns, data, onAdd, onDelete, onDeleteAll, onChange, colorClass, onOpenPaste }) => {
    
    // 텍스트영역 높이 자동 조절 함수
    const adjustHeight = (e) => {
        e.target.style.height = 'auto';
        e.target.style.height = e.target.scrollHeight + 'px';
    };

    return (
        <div className={`mb-8 border rounded-xl p-5 shadow-sm bg-white dark:bg-gray-800 dark:border-gray-700`}>
            <div className="flex justify-between items-center mb-4">
                <h3 className={`font-bold text-lg ${colorClass}`}>{title}</h3>
                <div className="flex gap-2">
                    {/* [추가] 전체 삭제 버튼 */}
                    {data.length > 0 && (
                        <button onClick={onDeleteAll} className="flex items-center gap-1 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 px-3 py-1.5 rounded text-sm font-bold hover:bg-red-100 dark:hover:bg-red-900/50 transition">
                            <Trash size={16} /> 전체 삭제
                        </button>
                    )}
                    {onOpenPaste && (
                        <button onClick={onOpenPaste} className="flex items-center gap-1 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 px-3 py-1.5 rounded text-sm font-bold hover:bg-green-100 dark:hover:bg-green-900/50 transition">
                            <Clipboard size={16} /> 엑셀 붙여넣기
                        </button>
                    )}
                    <button onClick={onAdd} className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded text-sm font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition dark:text-gray-300">
                        <Plus size={16} /> 행 추가
                    </button>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-center border-collapse table-fixed">
                    <thead className="bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-300">
                        <tr>
                            {columns.map((c, i) => <th key={i} className="p-2 border dark:border-gray-700 whitespace-nowrap">{c}</th>)}
                            <th className="p-2 border dark:border-gray-700 w-12">삭제</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {data.map((row, idx) => (
                            <tr key={idx}>
                                {Object.keys(row).map((key, k) => (
                                    <td key={k} className="p-1 border dark:border-gray-700 align-middle">
                                        {/* [수정] textarea 사용하여 줄바꿈 지원 */}
                                        <textarea
                                            className="w-full p-1.5 outline-none bg-transparent text-center dark:text-gray-200 resize-none overflow-hidden min-h-[32px]"
                                            rows={1}
                                            value={row[key]}
                                            onChange={(e) => {
                                                adjustHeight(e);
                                                onChange(idx, key, e.target.value);
                                            }}
                                            onFocus={(e) => adjustHeight(e)} // 포커스 시 높이 재조정
                                            placeholder="..."
                                            style={{ lineHeight: '1.5' }}
                                        />
                                    </td>
                                ))}
                                <td className="p-1 border dark:border-gray-700 align-middle">
                                    <button onClick={() => onDelete(idx)} className="text-gray-400 hover:text-red-500 flex justify-center w-full"><Trash2 size={16} /></button>
                                </td>
                            </tr>
                        ))}
                        {data.length === 0 && <tr><td colSpan={columns.length + 1} className="p-6 text-gray-400 text-center">데이터가 없습니다.</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --------------------------------------------------------
// 3. 메인 WorkLogPage 컴포넌트
// --------------------------------------------------------
const WorkLogPage = ({ workLogs, setWorkLogs }) => {
    const [pasteConfig, setPasteConfig] = useState({ open: false, type: '' });

    const handleChange = (section, idx, key, val) => {
        const newList = [...workLogs[section]];
        newList[idx][key] = val;
        setWorkLogs({ ...workLogs, [section]: newList });
    };

    const handleAdd = (section, template) => {
        setWorkLogs({ ...workLogs, [section]: [...workLogs[section], template] });
    };

    const handleDelete = (section, idx) => {
        const newList = workLogs[section].filter((_, i) => i !== idx);
        setWorkLogs({ ...workLogs, [section]: newList });
    };

    // [추가] 전체 삭제 핸들러
    const handleDeleteAll = (section) => {
        if(window.confirm('정말 이 항목의 모든 데이터를 삭제하시겠습니까?')) {
            setWorkLogs({ ...workLogs, [section]: [] });
        }
    };

    // [추가] 연락처 유형 자동 분류 함수
    const detectContactType = (rawContact) => {
        if (!rawContact) return '';
        const lower = rawContact.toLowerCase();
        
        if (lower.includes('@')) return '이메일';
        if (lower.includes('instagram.com') || lower.includes('www.instagram')) return 'DM발송';
        // 숫자와 하이픈만 있거나 010으로 시작하는 경우 전화로 간주
        if (/^[\d-]+$/.test(rawContact) || lower.includes('010')) return '전화';
        
        return rawContact; // 분류 불가 시 원본 반환
    };

    // 엑셀 데이터 처리 로직
    const handlePasteConfirm = (rows) => {
        const section = pasteConfig.type;
        const newEntries = [];

        rows.forEach(cols => {
            if (cols.length <= 1 && !cols[0]) return; // 빈 줄 무시

            if (section === 'recruitments') {
                // [요청 반영] 섭외 건수 매핑 및 자동 분류
                // 이미지 기준: Col 0(분야) | Col 1(업체명) | Col 2(예명-무시) | Col 3(전화번호/이메일) | Col 4(비고)
                const rawContact = cols[3] || cols[2] || '';
                const contactType = detectContactType(rawContact);

                newEntries.push({
                    category: cols[0] || '',
                    name: cols[1] || '',
                    contact: contactType, // 자동 분류된 값 저장
                    status: cols[4] || '' // 비고 내용
                });
            } else if (section === 'remarks') {
                newEntries.push({
                    category: cols[0] || '',
                    level: cols[1] || '',
                    name: cols[2] || '',
                    note: cols[3] || ''
                });
            } else if (section === 'interviews') {
                newEntries.push({
                    category: cols[0] || '',
                    name: cols[1] || '',
                    result: cols[2] || '',
                    note: cols[3] || ''
                });
            }
        });

        if (newEntries.length > 0) {
            setWorkLogs({ ...workLogs, [section]: [...workLogs[section], ...newEntries] });
            alert(`${newEntries.length}건이 추가되었습니다.`);
        }
    };

    return (
        <div className="p-4 max-w-6xl mx-auto">
            <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-blue-800 dark:text-blue-300 text-sm font-bold flex items-center gap-2 border border-blue-100 dark:border-blue-800">
                <Save size={18} /> 여기에 작성된 내용은 엑셀 다운로드 시 [기타] 시트에 자동으로 입력됩니다.
            </div>

            <Section
                title="1. 상담사 특이사항"
                colorClass="text-green-700 dark:text-green-400"
                columns={['분야', '단계', '상담사명', '특이사항']}
                data={workLogs.remarks}
                onAdd={() => handleAdd('remarks', { category: '', level: '', name: '', note: '' })}
                onDelete={(i) => handleDelete('remarks', i)}
                onDeleteAll={() => handleDeleteAll('remarks')} // 전체삭제 연결
                onChange={(i, k, v) => handleChange('remarks', i, k, v)}
                onOpenPaste={() => setPasteConfig({ open: true, type: 'remarks' })}
            />

            <Section
                title="2. 섭외 건수 (자동 분류: 전화/이메일/DM)"
                colorClass="text-indigo-700 dark:text-indigo-400"
                columns={['분야', '상담사명(업체명)', '연락방식(자동분류)', '진행상태(비고)']}
                data={workLogs.recruitments}
                onAdd={() => handleAdd('recruitments', { category: '', name: '', contact: '', status: '' })}
                onDelete={(i) => handleDelete('recruitments', i)}
                onDeleteAll={() => handleDeleteAll('recruitments')} // 전체삭제 연결
                onChange={(i, k, v) => handleChange('recruitments', i, k, v)}
                onOpenPaste={() => setPasteConfig({ open: true, type: 'recruitments' })}
            />

            <Section
                title="3. 면접 건수"
                colorClass="text-purple-700 dark:text-purple-400"
                columns={['분야', '상담사명', '결과(합격/불합격)', '비고']}
                data={workLogs.interviews}
                onAdd={() => handleAdd('interviews', { category: '', name: '', result: '', note: '' })}
                onDelete={(i) => handleDelete('interviews', i)}
                onDeleteAll={() => handleDeleteAll('interviews')} // 전체삭제 연결
                onChange={(i, k, v) => handleChange('interviews', i, k, v)}
                onOpenPaste={() => setPasteConfig({ open: true, type: 'interviews' })}
            />

            <PasteModal
                isOpen={pasteConfig.open}
                onClose={() => setPasteConfig({ ...pasteConfig, open: false })}
                onConfirm={handlePasteConfirm}
                title={pasteConfig.type === 'recruitments' ? '섭외 건수' : pasteConfig.type === 'remarks' ? '특이사항' : '면접 건수'}
            />
        </div>
    );
};

export default WorkLogPage;