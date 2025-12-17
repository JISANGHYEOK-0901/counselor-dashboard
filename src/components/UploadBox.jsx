import React, { useRef, useState } from 'react';
import { Upload, FileText, DownloadCloud, Plus } from 'lucide-react';

const UploadBox = ({ label, fileData, onUpload, onPaste, color='green' }) => {
    const inputRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);

    const isLoaded = !!fileData;

    // 1. 상태별 스타일 정의
    let themeClass = '';

    if (isLoaded) {
        // [파일이 있을 때]
        // 기존 색상을 유지하되, 마우스 올리면(Hover) 배경이 진해지고 살짝 커짐
        if (color === 'blue') {
            themeClass = 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-100 hover:bg-blue-100 hover:scale-[1.02] hover:shadow-md';
        } else if (color === 'purple') {
            themeClass = 'border-purple-500 bg-purple-50 text-purple-700 ring-2 ring-purple-100 hover:bg-purple-100 hover:scale-[1.02] hover:shadow-md';
        } else { // green
            themeClass = 'border-green-500 bg-green-50 text-green-700 ring-2 ring-green-100 hover:bg-green-100 hover:scale-[1.02] hover:shadow-md';
        }
    } else {
        // [파일이 없을 때 - 여기가 중요]
        // 평소엔 회색 점선 -> 마우스 올리면 보라색 점선 + 배경색 변경 + 그림자 + 글씨 진하게
        themeClass = 'border-gray-300 bg-white text-gray-500 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-600 hover:shadow-lg hover:scale-[1.01]';
    }

    // [드래그 중일 때] (최우선 스타일)
    const dragClass = 'border-indigo-500 bg-indigo-100 ring-4 ring-indigo-200 scale-105 shadow-xl z-10';

    // 최종 클래스 조합 (group 클래스 추가: 자식 요소 애니메이션 제어용)
    const containerClass = `flex-1 border-2 border-dashed rounded-xl flex flex-col items-center justify-center h-32 relative transition-all duration-300 ease-out cursor-pointer group select-none
        ${isDragging ? dragClass : themeClass}`;

    const handleBoxClick = () => { 
        if (inputRef.current) inputRef.current.click(); 
    };

    const handleDragOver = (e) => {
        e.preventDefault(); e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault(); e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault(); e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            onUpload({ target: { files: e.dataTransfer.files } });
        }
    };

    return (
        <div 
            onClick={handleBoxClick} 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={containerClass}
        >
            <div className="flex flex-col items-center justify-center h-full w-full pointer-events-none">
                {isDragging ? (
                    /* 드래그 중일 때 화면 */
                    <>
                        <DownloadCloud className="text-indigo-600 mb-2 animate-bounce" size={36}/>
                        <span className="font-bold text-indigo-700 text-lg">여기에 놓아주세요!</span>
                    </>
                ) : (
                    /* 평상시 화면 */
                    <>
                        {isLoaded ? (
                            <FileText className="mb-2 transition-transform duration-300 group-hover:scale-110" size={32}/>
                        ) : (
                            /* group-hover:-translate-y-1: 부모(박스)에 마우스 올리면 아이콘이 위로 살짝 움직임 */
                            <Upload className="text-gray-400 mb-2 transition-transform duration-300 group-hover:text-indigo-500 group-hover:-translate-y-1 group-hover:scale-110" size={30} />
                        )}
                        
                        <span className="font-bold text-base mb-1 transition-colors group-hover:text-indigo-700">
                            {label}
                        </span>

                        {isLoaded ? (
                            <div className="flex flex-col items-center">
                                <span className="text-sm font-medium px-3 py-1 bg-white bg-opacity-60 rounded shadow-sm truncate max-w-[180px] border border-transparent group-hover:border-indigo-200">
                                    {fileData.name}
                                </span>
                                <span className="text-[11px] mt-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                    클릭 또는 드래그하여 변경
                                </span>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-1">
                                <span className="text-xs transition-colors group-hover:text-indigo-600 bg-gray-100 group-hover:bg-indigo-100 px-2 py-0.5 rounded text-gray-500">
                                    클릭 또는 파일 드래그
                                </span>
                            </div>
                        )}
                    </>
                )}
            </div>
            
            <input 
                ref={inputRef} 
                type="file" 
                className="hidden" 
                onChange={onUpload} 
                onClick={(e) => { e.target.value = null; }} 
                accept=".xlsx, .xls" 
            />
            
            {/* 구글시트 버튼: 드래그 중이 아니고 파일이 없을 때 표시 */}
            {!isLoaded && !isDragging && (
                <button 
                    onClick={(e) => { e.stopPropagation(); onPaste(); }} 
                    className="absolute bottom-3 right-3 bg-white border border-gray-200 px-2.5 py-1.5 rounded-lg text-[11px] hover:bg-green-50 hover:text-green-700 hover:border-green-300 shadow-sm text-gray-500 font-bold transition-all z-10 pointer-events-auto flex items-center gap-1 group/btn"
                >
                    <Plus size={12} className="group-hover/btn:rotate-90 transition-transform"/> 구글시트
                </button>
            )}
        </div>
    );
};

export default UploadBox;