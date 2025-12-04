import React from 'react';

const EmptyState = ({ type }) => (
    <div className="text-center py-20 text-gray-400">
        {type === 'monthly' ? "데이터를 업로드하면 월간 분석 결과가 표시됩니다." : "데이터를 업로드해주세요."}
    </div>
);

export default EmptyState;