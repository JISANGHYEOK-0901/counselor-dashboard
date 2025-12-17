import React, { useState, useEffect, useMemo } from 'react';
import { generateAiAdvice } from '../utils/aiManager'; 
import { Sparkles } from 'lucide-react'; 

// ... (getCalculatedDates 함수 및 SCRIPTS 상수는 기존 코드와 동일하므로 생략 - 파일 상단에 유지해주세요) ...
const getCalculatedDates = () => {
  const today = new Date();
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const reRegister = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 6, 1);
  const formatFull = (d) => `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
  const formatMonthDay = (d) => `${d.getMonth() + 1}월 ${d.getDate()}일`;

  return {
    nextMonthFull: formatFull(nextMonth),
    nextMonthShort: formatMonthDay(nextMonth),
    reRegisterFull: formatFull(reRegister),
  };
};

const SCRIPTS = {
  'NEW': (name) => `선생님 안녕하세요!
앞으로 선생님 담당하게 될 홍카페 담당자 ㅇㅇㅇ입니다.
선생님 담당을 맡게 되어 연락드렸으며 간단하게 홍카페 안내 드리려고 합니다!

홍카페의 경우 앱 푸시 알람이 가기 때문에 사용하시는 핸드폰 기종에 따라 플레이스토어 또는 앱스토어를 통해 홍카페 앱을 다운로드 받아주시기 바랍니다!

홍카페의 상담은 주로 저녁시간이 상담이 가장 많으며 오후 5시 ~ 새벽2시까지가 상담이 주로 많으며 주말에는 이보다 더 늦게까지 상담이 활성화 되어있습니다.

홍카페 메인 -> 마이메뉴 -> 상담사에서 전화 상담 ON/OFF 기능을 통해 전화 상담 사용 ON을 선택해 주시면 상담 전화 연결이 가능하며 OFF 시 부재중으로 상담 상태가 리스트에 노출됩니다!

또한 콘텐츠 관리에서 상담사 공지 클릭해 보시면 상담사 공지사항이 있는데 공지사항에는 선생님 간단한 인사말과 접속 시간 그리고 잘 보시는 분야를 작성해 주시면 됩니다!

저희 홍카페에서는 매달 5시간 이상 상담을 해주셔야 하며, *개인사정으로 상담 시간을 채우지 못하실 때는 꼭! 연락 부탁드립니다!
상담 진행이 힘든 고객의 경우, 직접 차단이 가능하시니 상담 내역에서 회원 선택 후 차단해주시면 됩니다.
또한 상담 시 개인정보 교류는 규정상 금지 되어있습니다! 내담자와 개인정보를 공유하지말아주세요!

추가적인 문의나 궁금하신 사항은 언제든지 카카오톡 남겨주시거나 010-ㅇㅇㅇㅇ-ㅇㅇㅇㅇ로 연락 부탁드립니다!
(📌 이 전 면접 담당자에게는 연락하지말아주세요!)

※ 홍카페는 비밀상담을 원칙으로 하기 때문에 다른 고객분의 내용 또는 후기에서 상담 내용을 적으면 안되며,
 개인 거래(연락처, 주소, SNS) 전달 또한 불가하니 이 점 참고해 주시기 바랍니다.

궁금하신 부분이나 요청사항 있으실 경우
[ 평일 09:00-18:00 ] (주말 및 공휴일 휴무)
카카오톡으로 말씀 주시면 답변 바로 드리겠습니다!
(담당자 연차, 주말 및 공휴일 휴무엔 답변이 늦어질 수 있는 부분 양해부탁드립니다.😭)

---------------------------------------

추가로 금일 등록 완료 후 보내드린 계약서 관련 안내 드립니다.

계약서는 플랫폼 활동을 위한 계약서로 선생님의 메일로 모두싸인이라는 전자 계약서로 발송했습니다.

확인 후 작성 부탁드리며 계약서는 예명이 아닌 [[본명]]으로 작성 부탁드리며 주민번호는 [[13자리 전체]] 기입 부탁드리겠습니다!`,

  'C': (name) => `안녕하세요 선생님!\n이번 주 상담 내역 확인해보면 부재중 통화가 조금씩 있는데 고객분은 통화 안받으면 선생님한테 상담 안받으시고 다른분에게 넘어가니 꼭 상담 잘 받아주시고 상담 불가하시면 꼭 상담 OFF 해주세요!`,
  'D': (name) => `안녕하세요 선생님!\n후기 작성이 안되어 있으신데 고객 분들이 재방문 할 수 있는 요소 중 하나가 후기여서 시간나실때 꼭 작성 부탁드립니다!`,
  'A': (name) => `안녕하세요 선생님!\n이번 주 접속이 없으신데 자꾸 접속 없으시면 노출이 안되서 선생님이 다음에 오래 키신다고 하시더라도 인입이 없어지십니다. 접속 부탁드리며 고정 접속시간 확보하셔서 시간 정하셔서 접속 꼭 해주세요!`,
  'B': (name) => `안녕하세요 선생님!\n매출이 조금씩 떨어지고 있으신데 접속시간 조금 더 늘려보시고 원래 접속하시던 시간대보다 다른 시간대도 한번씩 접속해보시면서 상담 시간 늘려보세요!`,
  'WARN': (name, dates) => `안녕하세요 선생님!\n\n이번 달 기준 접속 이력이 없거나\n정산시간이 5시간 미만일 경우\n\n${dates.nextMonthShort}부터 프로필이 블라인드 처리될 예정입니다.\n\n블라인드된 프로필은 다시 올려달라고 하셔도 복구되지 않으며,\n6개월 경과 후 상담사 재등록 신청이 가능합니다.\n\n안정적인 상담 연결과 신뢰도 유지를 위한 정책이오니,\n이 점 참고하시어 상담 활동에 참여 부탁드립니다.\n\n감사합니다.`,
  'BLIND': (name, dates) => `안녕하세요 선생님!\n\n선생님께서는 0단계 5시간 미달성으로 ${dates.nextMonthFull}부로 상담사 블라인드 처리가 완료되었음을 안내드립니다.\n\n재등록은 6개월 이후부터 가능하며 재등록을 원하실 경우 해당 시점에 고객센터로 문의 부탁드립니다.\n\n감사합니다.`
};

export default function MessageModal({ isOpen, onClose, counselor }) {
  const [activeTab, setActiveTab] = useState('A');
  const [text, setText] = useState('');
  
  const dates = useMemo(() => getCalculatedDates(), []);

  // 탭 자동 선택 로직
  useEffect(() => {
    if (isOpen && counselor) {
      const issues = counselor.issues || []; 
      const status = counselor.status;
      const curTime = counselor.curTime || 0; 

      if (status === 'new') setActiveTab('NEW');
      else if (status === 'blind') setActiveTab('BLIND');
      else if (issues.some(i => i.startsWith('C'))) setActiveTab('C');
      else if (issues.some(i => i.startsWith('D'))) setActiveTab('D');
      else if (issues.some(i => i.startsWith('A'))) setActiveTab('A');
      else if (issues.some(i => i.startsWith('B'))) setActiveTab('B');
      else if (curTime < 5 * 3600) setActiveTab('WARN');
      else setActiveTab('A');
    }
  }, [isOpen, counselor]);

  // 기본 텍스트 생성 로직
  useEffect(() => {
    if (counselor && SCRIPTS[activeTab]) {
      const displayName = counselor.realName || counselor.nick; 
      if (activeTab === 'WARN' || activeTab === 'BLIND') {
        setText(SCRIPTS[activeTab](displayName, dates));
      } else {
        setText(SCRIPTS[activeTab](displayName));
      }
    }
  }, [activeTab, counselor, dates]);

  const handleAiWrite = () => {
    if (!counselor) return;
    const aiText = generateAiAdvice(counselor, activeTab);
    setText(aiText);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(text);
    alert('메시지가 복사되었습니다!');
    onClose();
  };

  if (!isOpen || !counselor) return null;

  // 스타일 정의
  const getTabStyle = (tabKey) => {
    const isActive = activeTab === tabKey;
    const hasIssue = counselor.issues?.some(i => i.startsWith(tabKey));
    let base = "px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ";
    if (isActive) return base + "bg-purple-600 text-white border-purple-600 shadow-md";
    else if (hasIssue) return base + "bg-purple-50 text-purple-700 border-purple-200 ring-2 ring-purple-100";
    else return base + "bg-white text-gray-500 border-gray-200 hover:bg-gray-50";
  };

  const warnStyle = activeTab === 'WARN'
    ? 'px-3 py-1.5 rounded-full text-sm font-medium border bg-orange-500 text-white border-orange-500'
    : 'px-3 py-1.5 rounded-full text-sm font-medium border text-orange-600 border-orange-200 bg-orange-50 hover:bg-orange-100';

  const blindStyle = activeTab === 'BLIND'
    ? 'px-3 py-1.5 rounded-full text-sm font-medium border bg-red-600 text-white border-red-600'
    : 'px-3 py-1.5 rounded-full text-sm font-medium border text-red-600 border-red-200 bg-red-50 hover:bg-red-100';

  const newStyle = activeTab === 'NEW'
    ? 'px-3 py-1.5 rounded-full text-sm font-medium border bg-teal-500 text-white border-teal-500'
    : 'px-3 py-1.5 rounded-full text-sm font-medium border text-teal-600 border-teal-200 bg-teal-50 hover:bg-teal-100';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-xl shadow-2xl p-6 transform transition-all border dark:border-gray-700">
        
        <div className="flex justify-between items-center mb-4 border-b dark:border-gray-700 pb-3">
          <div>
            <span className="text-gray-500 text-sm">To.</span>
            <h2 className="text-lg font-bold text-gray-800 dark:text-white">
              {counselor.category}_{counselor.realName}_{counselor.nick}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <button onClick={() => setActiveTab('NEW')} className={newStyle}>🐣 신규</button>
          <div className="w-px h-6 bg-gray-300 mx-1 self-center"></div>
          <button onClick={() => setActiveTab('C')} className={getTabStyle('C')}>📞 부재중</button>
          <button onClick={() => setActiveTab('D')} className={getTabStyle('D')}>✍️ 후기</button>
          <button onClick={() => setActiveTab('A')} className={getTabStyle('A')}>⏰ 접속</button>
          <button onClick={() => setActiveTab('B')} className={getTabStyle('B')}>📉 매출</button>
          <div className="w-px h-6 bg-gray-300 mx-1 self-center"></div>
          <button onClick={() => setActiveTab('WARN')} className={warnStyle}>⚠️ 경고</button>
          <button onClick={() => setActiveTab('BLIND')} className={blindStyle}>🚫 안내</button>
        </div>

        {/* [수정] 조건부 렌더링: 신규, 경고, 안내 탭에서는 AI 버튼 숨김 */}
        {!['NEW', 'WARN', 'BLIND'].includes(activeTab) && (
            <div className="flex justify-end mb-2">
                <button 
                    onClick={handleAiWrite}
                    className="flex items-center gap-1.5 text-xs font-bold bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-3 py-1.5 rounded-full hover:from-indigo-600 hover:to-purple-600 transition shadow-sm transform hover:scale-105"
                >
                    <Sparkles size={12} fill="currentColor" /> AI 매니저로 다시 쓰기
                </button>
            </div>
        )}

        <div className="relative">
          <textarea
            className="w-full h-60 p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white dark:focus:bg-gray-800 transition-all"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="absolute bottom-4 right-4 text-xs text-gray-400">* 내용은 수정 가능합니다.</div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-3 px-4 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">취소</button>
          <button onClick={copyToClipboard} className="flex-1 py-3 px-4 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 shadow-lg transition-colors flex justify-center items-center gap-2">
            <span>복사하기</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
          </button>
        </div>

      </div>
    </div>
  );
}