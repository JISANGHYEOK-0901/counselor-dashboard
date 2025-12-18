import React, { useState } from 'react';
import { BookOpen, Upload, Search, BarChart2, MessageCircle, FileText, ChevronDown, ChevronUp, Zap, HelpCircle } from 'lucide-react';

const Section = ({ title, icon: Icon, children, isOpen, onToggle }) => (
  <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden mb-4 bg-white dark:bg-gray-800 shadow-sm transition-all">
    <button 
      onClick={onToggle}
      className="w-full flex items-center justify-between p-5 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg text-indigo-600 dark:text-indigo-400">
          <Icon size={20} />
        </div>
        <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100">{title}</h3>
      </div>
      {isOpen ? <ChevronUp className="text-gray-400" /> : <ChevronDown className="text-gray-400" />}
    </button>
    
    {isOpen && (
      <div className="p-6 border-t border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-300 space-y-4 text-sm leading-relaxed">
        {children}
      </div>
    )}
  </div>
);

const UsageGuide = () => {
  const [openSection, setOpenSection] = useState(0);

  const toggle = (idx) => setOpenSection(openSection === idx ? -1 : idx);

  return (
    <div className="max-w-5xl mx-auto animate-fade-in-up">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2 flex items-center justify-center gap-2">
          <BookOpen className="text-indigo-600 dark:text-indigo-400"/> 사용 설명서
        </h2>
        <p className="text-gray-500 dark:text-gray-400">상담사 통합 관리 시스템의 주요 기능을 안내해 드립니다.</p>
      </div>

      <Section title="1. 데이터 업로드 및 분석 (기초)" icon={Upload} isOpen={openSection === 0} onToggle={() => toggle(0)}>
        <p>
          <strong className="text-indigo-600 dark:text-indigo-400">📊 주간/월간 대시보드</strong>를 보려면 아테나 정산현황 엑셀다운로드(기본) 파일 업로드가 필요합니다.
        </p>
        <ul className="list-disc pl-5 space-y-2 mt-2">
          <li>
            <b>주간 분석:</b> [지난주] 파일과 [이번주] 파일을 각각 업로드 후 <span className="bg-gray-200 dark:bg-gray-700 px-1 rounded text-xs font-bold">분석 실행</span> 버튼을 누르세요.
          </li>
          <li>
            <b>월간 분석:</b> [비교 데이터(지난달)]와 [기준 데이터(이번달)]을 업로드합니다.
          </li>
          <li>
            <b>파일 형식:</b> 상담사 닉네임, 매출, 접속시간 등이 포함된 원본 엑셀 파일(.xlsx)을 드래그하거나 클릭하여 업로드합니다.
          </li>
          <li>
            <b>데이터 이동:</b> 화살표 아이콘(➡)을 누르면 '이번주/이번달' 데이터를 '지난주/지난달' 칸으로 손쉽게 옮길 수 있습니다.
          </li>
        </ul>
      </Section>

      <Section title="2. AI 자연어 검색 활용" icon={Search} isOpen={openSection === 1} onToggle={() => toggle(1)}>
        <p>
          복잡한 필터 설정 없이, <strong className="text-indigo-600 dark:text-indigo-400">채팅하듯 검색</strong>하여 원하는 상담사를 찾을 수 있습니다.
        </p>
        <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg mt-3">
          <p className="font-bold mb-2">💡 검색 예시</p>
          <ul className="space-y-1 font-mono text-xs text-gray-700 dark:text-gray-400">
            <li>"평균 매출 이상인 상담사 보여줘"</li>
            <li>"접속시간 50시간 이상이면서 퍼플 등급만"</li>
            <li>"매출은 높은데 접속시간이 적은 사람" (AI가 효율 분석)</li>
            <li>"신규 상담사" / "블라인드"</li>
            <li>"타로 분야 2단계"</li>
          </ul>
        </div>
      </Section>

      <Section title="3. 이슈 코드 및 메시지 관리" icon={MessageCircle} isOpen={openSection === 2} onToggle={() => toggle(2)}>
        <p>상담사 리스트에 표시되는 <span className="text-red-500 font-bold">A, B, C, D</span> 배지는 다음을 의미합니다.</p>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <li className="bg-red-50 dark:bg-red-900/20 p-3 rounded border border-red-100 dark:border-red-800">
            <strong className="text-red-600 dark:text-red-400">A (접속시간)</strong>: 설정된 최소 시간 미달
          </li>
          <li className="bg-red-50 dark:bg-red-900/20 p-3 rounded border border-red-100 dark:border-red-800">
            <strong className="text-red-600 dark:text-red-400">B (매출하락)</strong>: 전주/전월 대비 매출 대폭 하락
          </li>
          <li className="bg-red-50 dark:bg-red-900/20 p-3 rounded border border-red-100 dark:border-red-800">
            <strong className="text-red-600 dark:text-red-400">C (부재중)</strong>: 부재중 건수 과다 발생
          </li>
          <li className="bg-red-50 dark:bg-red-900/20 p-3 rounded border border-red-100 dark:border-red-800">
            <strong className="text-red-600 dark:text-red-400">D (후기)</strong>: 미답변 후기 존재
          </li>
        </ul>
        <p className="mt-3">
          테이블 우측의 <b>[메시지]</b> 버튼을 누르면, 해당 이슈에 맞는 <strong className="text-purple-600">피드백 메시지가 자동으로 생성</strong>됩니다. AI 매니저 기능을 통해 톤앤매너를 부드럽게 수정할 수도 있습니다.
        </p>
      </Section>

      <Section title="4. 광고 관리 (Ad Manager)" icon={Zap} isOpen={openSection === 3} onToggle={() => toggle(3)}>
        <p>등급별(그린/퍼플) 및 분야별(타로/사주/신점) 광고 신청 주기를 관리합니다.</p>
        <ul className="list-disc pl-5 space-y-2 mt-2">
          <li>
            <b>자동 계산:</b> 상담사의 등급을 인식하여 '전화(메인)', '채팅(타로)' 등 신청 가능한 광고 목록을 보여줍니다.
          </li>
          <li>
            <b>쿨타임 체크:</b> 이전에 신청한 날짜를 기록해두면, <span className="text-red-500 font-bold">다음 신청 가능일까지 남은 주(Week)</span>를 자동으로 계산해 줍니다.
          </li>
          <li>
            <b>신청서 생성:</b> [신청] 버튼을 누르면 우측 패널에 신청 텍스트가 자동 생성되어 바로 복사할 수 있습니다.
          </li>
          <li>
            <b>개별 명단:</b> 전체 데이터 외에 특정 상담사 명단만 따로 관리해야 한다면, 상단 필터의 '구분:개별'을 선택하고 별도 엑셀을 업로드하세요.
          </li>
        </ul>
      </Section>

      <Section title="5. 성과 보고서 및 업무 일지" icon={FileText} isOpen={openSection === 4} onToggle={() => toggle(4)}>
        <div className="space-y-4">
          <div>
            <h4 className="font-bold text-gray-800 dark:text-white mb-1">📝 성과 보고서 (6개월)</h4>
            <p>
              [성과 보고서] 탭에서 1월~6월(상반기) 또는 7월~12월(하반기) 엑셀 파일 6개를 각각 업로드하면, 
              <br/>중도 입사자를 고려한 평균 매출과 <b>다음 반기 목표가 포함된 보고서</b>를 엑셀로 다운로드할 수 있습니다.
            </p>
          </div>
          <div className="border-t dark:border-gray-700 pt-3">
            <h4 className="font-bold text-gray-800 dark:text-white mb-1">📓 업무 일지</h4>
            <p>
              특이사항, 섭외, 면접 내역을 기록하는 공간입니다. <br/>
              <b>[엑셀 붙여넣기]</b> 기능을 사용하여 스프레드시트의 데이터를 복사(Ctrl+C) 후 붙여넣기(Ctrl+V) 하면 자동으로 표에 정리됩니다.
              이 데이터는 월간 보고서 다운로드 시 '기타' 시트에 포함됩니다.
            </p>
          </div>
        </div>
      </Section>

      <Section title="6. 기타 유용한 기능" icon={HelpCircle} isOpen={openSection === 5} onToggle={() => toggle(5)}>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <b>다크 모드:</b> 우측 상단의 해/달 아이콘을 눌러 눈이 편한 모드로 전환하세요.
          </li>
          <li>
            <b>데이터 초기화:</b> 브라우저에 저장된 데이터를 모두 지우고 싶다면 우측 상단 [초기화] 버튼을 사용하세요.
          </li>
          <li>
            <b>AI 챗봇:</b> 우측 하단의 챗봇 아이콘을 눌러 "전체 현황 요약해줘", "문제 있는 상담사 알려줘" 등을 물어보세요.
          </li>
        </ul>
      </Section>
    </div>
  );
};

export default UsageGuide;