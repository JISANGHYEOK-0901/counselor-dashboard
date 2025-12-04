import React, { useRef } from 'react';
import { Upload, FileText } from 'lucide-react';

const UploadBox = ({ label, fileData, onUpload, onPaste, color='green' }) => {
    const inputRef = useRef(null);
    const isLoaded = !!fileData;
    const theme = isLoaded 
        ? (color === 'blue' ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-100' 
        : color === 'purple' ? 'border-purple-500 bg-purple-50 text-purple-700 ring-2 ring-purple-100' 
        : 'border-green-500 bg-green-50 text-green-700 ring-2 ring-green-100') 
        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50';
    
    const handleBoxClick = () => { if (inputRef.current) inputRef.current.click(); };

    return (
        <div onClick={handleBoxClick} className={`flex-1 border-2 border-dashed rounded-lg flex flex-col items-center justify-center h-32 relative transition-all duration-200 cursor-pointer ${theme}`}>
            <div className="flex flex-col items-center justify-center h-full w-full pointer-events-none">
                {isLoaded ? <FileText className="mb-2" size={32}/> : <Upload className="text-gray-400 mb-2" size={28} />}
                <span className="font-bold text-base mb-1">{label}</span>
                {isLoaded ? (
                    <div className="flex flex-col items-center">
                        <span className="text-sm font-medium px-3 py-1 bg-white bg-opacity-60 rounded shadow-sm truncate max-w-[180px]">{fileData.name}</span>
                        <span className="text-xs mt-1 text-gray-500 underline">클릭하여 파일 변경</span>
                    </div>
                ) : (
                    <span className="text-sm text-gray-500">클릭하여 파일 업로드</span>
                )}
            </div>
            <input ref={inputRef} type="file" className="hidden" onChange={onUpload} onClick={(e) => { e.target.value = null; }} accept=".xlsx, .xls" />
            {!isLoaded && <button onClick={(e) => { e.stopPropagation(); onPaste(); }} className="absolute bottom-3 right-3 bg-white border border-gray-300 px-3 py-1.5 rounded text-xs hover:bg-gray-100 shadow-sm text-gray-600 font-bold transition z-10 pointer-events-auto">구글시트</button>}
        </div>
    );
};

export default UploadBox;