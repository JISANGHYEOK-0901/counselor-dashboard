import * as XLSX from 'xlsx-js-style';

// ==========================================
// 0. 스타일 및 설정 정의
// ==========================================
const FONTS = {
  header: { name: "가을체", sz: 11, bold: true },
  body: { name: "Arial", sz: 10 }
};

const COLORS = {
  purpleBg: { rgb: "7030A0" },    // 보라색 배경
  lightPurpleFg: { rgb: "E6E6FA" }, // 연보라 글자
  greenBg: { rgb: "E2EFDA" },     // 연초록 배경
  blackFg: { rgb: "000000" },
  grayBorder: { rgb: "BFBFBF" },
  headerGray: { rgb: "E9ECEF" }
};

const CURRENCY_STYLE = {
  font: { name: "Arial", sz: 10 },
  alignment: { vertical: "center", horizontal: "right" },
  border: {
    top: { style: "thin", color: { rgb: "BFBFBF" } },
    bottom: { style: "thin", color: { rgb: "BFBFBF" } },
    left: { style: "thin", color: { rgb: "BFBFBF" } },
    right: { style: "thin", color: { rgb: "BFBFBF" } }
  },
  numFmt: '#,##0"원"' // 엑셀 사용자 지정 서식
};

const STYLES = {
  purpleHeader: {
    fill: { fgColor: COLORS.purpleBg },
    font: { ...FONTS.header, color: COLORS.lightPurpleFg },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } }
  },
  greenHeader: {
    fill: { fgColor: COLORS.greenBg },
    font: { ...FONTS.header, color: COLORS.blackFg },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } }
  },
  body: {
    font: { ...FONTS.body },
    alignment: { vertical: "center", horizontal: "center" },
    border: { top: { style: "thin", color: COLORS.grayBorder }, bottom: { style: "thin", color: COLORS.grayBorder }, left: { style: "thin", color: COLORS.grayBorder }, right: { style: "thin", color: COLORS.grayBorder } }
  },
  // [NEW] 줄바꿈이 적용된 본문 스타일 (텍스트가 길 경우 자동 줄바꿈)
  wrappedBody: {
    font: { ...FONTS.body },
    alignment: { vertical: "top", horizontal: "center", wrapText: true }, 
    border: { top: { style: "thin", color: COLORS.grayBorder }, bottom: { style: "thin", color: COLORS.grayBorder }, left: { style: "thin", color: COLORS.grayBorder }, right: { style: "thin", color: COLORS.grayBorder } }
  },
  numberBody: {
    font: { ...FONTS.body },
    alignment: { vertical: "center", horizontal: "right" },
    border: { top: { style: "thin", color: COLORS.grayBorder }, bottom: { style: "thin", color: COLORS.grayBorder }, left: { style: "thin", color: COLORS.grayBorder }, right: { style: "thin", color: COLORS.grayBorder } }
  }
};

// 헬퍼: 자동 열 너비 계산
const autoFitColumns = (ws, headerRowIndex = 0, padding = 4) => {
  if (!ws['!ref']) return;
  const range = XLSX.utils.decode_range(ws['!ref']);
  const colWidths = [];

  for (let C = range.s.c; C <= range.e.c; ++C) {
    let maxLen = 0;
    for (let R = range.s.r; R <= range.e.r; ++R) {
      const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
      if (cell && cell.v) {
        const value = String(cell.v);
        let len = 0;
        for (let i = 0; i < value.length; i++) {
            len += value.charCodeAt(i) > 128 ? 1.5 : 1; 
        }
        if (len > maxLen) maxLen = len;
      }
    }
    colWidths[C] = { wch: Math.min(maxLen + padding, 80) }; 
  }
  ws['!cols'] = colWidths;
};

// 헬퍼: 셀 스타일 적용
const applyCellStyle = (ws, range, styleType) => {
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[addr]) continue;
      ws[addr].s = STYLES[styleType];
      
      // 숫자 데이터(%, 원) 별도 처리 (단, wrappedBody가 아닐 때만)
      if (styleType === 'body' && (typeof ws[addr].v === 'number' || String(ws[addr].v).includes('%'))) {
         ws[addr].s = STYLES.numberBody;
      }
    }
  }
};

// 헬퍼: 줌 설정
const setZoom = (ws) => {
  if (!ws['!views']) ws['!views'] = [];
  ws['!views'].push({ zoomScale: 80 });
};

// 시간 포맷 변환 헬퍼 함수 (초 단위)
const formatTime = (seconds) => {
  if (!seconds) return "0시간 00분 00초";
  
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  const mStr = m.toString().padStart(2, '0');
  const sStr = s.toString().padStart(2, '0');

  return `${h}시간 ${mStr}분 ${sStr}초`;
};

// ==========================================
// 메인 생성 함수
// ==========================================
export const generateMonthlyReportExcel = (analyzedCurrent, analyzedPast, targetMonth, userMemo = {}, workLogs = null) => {
  const wb = XLSX.utils.book_new();
  const currentMonthNum = parseInt(targetMonth);
  // 1월인 경우 이전달은 12월
  const prevMonthNum = currentMonthNum === 1 ? 12 : currentMonthNum - 1;
  
  const monthStr = `${currentMonthNum}월`;
  const prevMonthStr = `${prevMonthNum}월`;

  // ------------------------------------------------------------------
  // Sheet 1: 매출 증감
  // ------------------------------------------------------------------
  const s1Header = [
    '분야', '단계', '단계', '닉네임', 
    `${prevMonthStr} 접속시간`, `${monthStr} 접속시간`, '접속 증감률', 
    `${prevMonthStr} 전체정산금액`, `${monthStr} 전체정산금액`, '정산 증감률', 
    '증감액', '증감사유', '목표설정'
  ];
  
  const s1Data = [];
  const mergeText = '증액,하락\n통합\n(전체상담사)\n단계별로 정렬';
  
  analyzedCurrent.forEach((row, i) => {
    const prevGross = row.prevRev || 0; 
    const currGross = row.curRev || 0;

    s1Data.push([
      i === 0 ? mergeText : '', 
      row.category || '-',
      row.levelCat || '-',
      row.level || '-',
      row.nick,
      formatTime(row.prevTime),
      formatTime(row.curTime),
      (row.timeRate * 100).toFixed(1) + '%',
      prevGross, 
      currGross, 
      (row.revRate * 100).toFixed(1) + '%',
      currGross - prevGross,
      row.reason || '-', 
      row.goal || '-' 
    ]);
  });

  const ws1 = XLSX.utils.aoa_to_sheet([
    [''], 
    ['', ...s1Header], 
    ...s1Data
  ]);

  XLSX.utils.sheet_add_aoa(ws1, [[monthStr]], { origin: "A2" });

  const ws1Range = XLSX.utils.decode_range(ws1['!ref']);
  applyCellStyle(ws1, {s: {r:1, c:1}, e: {r:1, c:13}}, 'purpleHeader');
  applyCellStyle(ws1, {s: {r:2, c:0}, e: ws1Range.e}, 'body');
  
  const aColStyle = { ...STYLES.body, alignment: { horizontal: "center", vertical: "center", wrapText: true } };
  for(let r=2; r<=9; r++) { const addr = XLSX.utils.encode_cell({r, c:0}); if(ws1[addr]) ws1[addr].s = aColStyle; }
  ws1['!merges'] = [{ s: {r:2, c:0}, e: {r:9, c:0} }];

  for (let R = 2; R <= ws1Range.e.r; ++R) {
      [8, 9, 11].forEach(C => {
          const addr = XLSX.utils.encode_cell({ r: R, c: C });
          if (ws1[addr]) ws1[addr].s = CURRENCY_STYLE;
      });
  }

  autoFitColumns(ws1, 1, 5);
  setZoom(ws1);
  XLSX.utils.book_append_sheet(wb, ws1, "매출 증감");

  // ------------------------------------------------------------------
  // Sheet 2: 단계별 상담사
  // ------------------------------------------------------------------
  const levels = ['등록존', '6단계', '5단계', '4단계', '3단계', '2단계', '1단계', '0단계'];
  const counts = { '퍼플': Array(8).fill(0), '그린': Array(8).fill(0) };
  
  analyzedCurrent.forEach(r => {
    if(r.status === 'blind') return;
    const type = String(r.levelCat||'').includes('퍼플') ? '퍼플' : '그린';
    const lvl = String(r.level||'');
    let idx = lvl.includes('등록') ? 0 : (7 - (parseInt(lvl.replace(/[^0-9]/g, ''))||0));
    if (idx >= 0 && counts[type][idx] !== undefined) counts[type][idx]++;
  });

  const ws2 = XLSX.utils.aoa_to_sheet([
    ['퍼플', ...Array(7).fill('')], levels, counts['퍼플'],
    [''],
    ['그린', ...Array(7).fill('')], levels, counts['그린']
  ]);

  applyCellStyle(ws2, {s:{r:1, c:0}, e:{r:1, c:7}}, 'purpleHeader');
  applyCellStyle(ws2, {s:{r:5, c:0}, e:{r:5, c:7}}, 'purpleHeader');
  applyCellStyle(ws2, {s:{r:2, c:0}, e:{r:2, c:7}}, 'body');
  applyCellStyle(ws2, {s:{r:6, c:0}, e:{r:6, c:7}}, 'body');
  setZoom(ws2);
  XLSX.utils.book_append_sheet(wb, ws2, "단계별 상담사");

  // ------------------------------------------------------------------
  // Sheet 3: 파트너, 블라인드, 신규
  // ------------------------------------------------------------------
  const partnerRows = [];
  let targetYM = 0;      
  let targetDateStr = ""; 

  analyzedCurrent.forEach(row => {
    const m = String(row.memo || "");
    const match = m.match(/(\d{2}\.\d{2})월.*파트너/);
    if(match) {
        const dateStr = match[1]; 
        const parts = dateStr.split('.');
        const currentVal = parseInt(parts[0]) * 100 + parseInt(parts[1]); 
        if(currentVal > targetYM) {
            targetYM = currentVal;
            targetDateStr = dateStr;
        }
    }
  });

  if(targetDateStr) {
      analyzedCurrent.forEach(row => {
          const m = String(row.memo || "");
          if(m.includes(targetDateStr) && m.includes('파트너')) {
             const grossRevenue = row.curRev || 0; 
             partnerRows.push([
                 row.category, row.levelCat, row.level, row.nick, 
                 '-', targetDateStr, 
                 formatTime(row.curSettleTime), 
                 grossRevenue, ''
             ]);
          }
      });
  }
  
  if(partnerRows.length > 0) partnerRows[0][8] = partnerRows.length+'명';
  else partnerRows.push(['', '', '', '', '', '대상 없음', '', '', '']);

  const blindRows = analyzedCurrent.filter(r => r.status === 'blind').map((r, i) => {
      const memoContent = userMemo[r.nick] || '미활동';
      return [
          monthStr, r.category, r.levelCat, r.level, r.nick, 
          memoContent, 
          i===0 ? (analyzedCurrent.filter(x=>x.status==='blind').length+'명') : ''
      ];
  });
  if(blindRows.length === 0) blindRows.push(['', '', '', '', '', '대상 없음', '']);

  const newRows = analyzedCurrent.filter(r => r.status === 'new').map((r, i) => {
      const memoContent = userMemo[r.nick] || '-';
      return [
          monthStr, r.category, r.levelCat, r.level, r.nick, 
          memoContent, 
          i===0 ? (analyzedCurrent.filter(x=>x.status==='new').length+'명') : ''
      ];
  });
  if(newRows.length === 0) newRows.push(['', '', '', '', '', '대상 없음', '']);

  const ws3 = XLSX.utils.aoa_to_sheet([]);
  let currRow = 1;

  const pTitle = targetDateStr ? `■ 파트너 계약 상담사 (${targetDateStr}월 적용)` : `■ 파트너 계약 상담사`;
  XLSX.utils.sheet_add_aoa(ws3, [[pTitle]], {origin: {r: currRow++, c: 1}});
  
  XLSX.utils.sheet_add_aoa(ws3, [['분야', '등록단계', '단계', '활동명', '등록일', '계약일', '전체정산', '정산금액', 'TTL']], {origin: {r: currRow, c: 1}});
  applyCellStyle(ws3, {s:{r:currRow, c:1}, e:{r:currRow, c:9}}, 'greenHeader');
  currRow++;
  XLSX.utils.sheet_add_aoa(ws3, partnerRows, {origin: {r: currRow, c: 1}});
  applyCellStyle(ws3, {s:{r:currRow, c:1}, e:{r:currRow + partnerRows.length - 1, c:9}}, 'body');
  for(let i=0; i<partnerRows.length; i++) {
      const addr = XLSX.utils.encode_cell({r: currRow+i, c: 8}); 
      if(ws3[addr]) ws3[addr].s = CURRENCY_STYLE;
  }
  currRow += partnerRows.length + 2;

  XLSX.utils.sheet_add_aoa(ws3, [['■ 블라인드 상담사']], {origin: {r: currRow++, c: 1}});
  XLSX.utils.sheet_add_aoa(ws3, [['월', '분야', '단계', '단계', '활동명', '사유', 'TTL']], {origin: {r: currRow, c: 1}});
  applyCellStyle(ws3, {s:{r:currRow, c:1}, e:{r:currRow, c:7}}, 'greenHeader');
  currRow++;
  XLSX.utils.sheet_add_aoa(ws3, blindRows, {origin: {r: currRow, c: 1}});
  applyCellStyle(ws3, {s:{r:currRow, c:1}, e:{r:currRow + blindRows.length - 1, c:7}}, 'body');
  currRow += blindRows.length + 2;

  XLSX.utils.sheet_add_aoa(ws3, [['■ 신규 상담사']], {origin: {r: currRow++, c: 1}});
  XLSX.utils.sheet_add_aoa(ws3, [['월', '분야', '등록단계', '단계', '활동명', '등록일', 'TTL']], {origin: {r: currRow, c: 1}});
  applyCellStyle(ws3, {s:{r:currRow, c:1}, e:{r:currRow, c:7}}, 'greenHeader');
  currRow++;
  XLSX.utils.sheet_add_aoa(ws3, newRows, {origin: {r: currRow, c: 1}});
  applyCellStyle(ws3, {s:{r:currRow, c:1}, e:{r:currRow + newRows.length - 1, c:7}}, 'body');

  autoFitColumns(ws3, 0, 4);
  setZoom(ws3);
  XLSX.utils.book_append_sheet(wb, ws3, "파트너,블라인드,신규");

  // ------------------------------------------------------------------
  // Sheet 4: 전체매출
  // ------------------------------------------------------------------
  const s4Header = [
    '월', '카테고리', '단계(그룹)', '단계(레벨)', '닉네임', '이름', 
    '후기수', '답변수', '답변률', '만족도', 
    '코인콜수 전체', '코인콜수 성공', '코인콜수 실패', 
    '060콜수 전체', '060콜수 성공', '060콜수 실패', 
    '전체콜수(부재)', '접속시간', '전체정산', '전체정산 금액'
  ];

  const s4Data = analyzedCurrent.filter(r => r.status !== 'blind').map(r => {
    const replyRate = r.reviews > 0 ? ((r.answers / r.reviews) * 100).toFixed(1) + '%' : '0.0%';
    return [
      '', 
      monthStr,
      r.category,
      r.levelCat,
      r.levelNum,
      r.nick,
      r.realName,
      r.reviews || 0,
      r.answers || 0,
      replyRate,
      r.satisfaction || 0,
      r.coinTotal || 0,
      r.coinSuccess || 0,
      r.coinFail || 0,
      r.phoneTotal || 0,
      r.phoneSuccess || 0,
      r.phoneFail || 0,
      r.curMissed || 0,
      formatTime(r.curTime),       
      formatTime(r.curSettleTime), 
      r.curRev || 0                
    ];
  });

  const ws4 = XLSX.utils.aoa_to_sheet([[''], ['', ...s4Header], ...s4Data]);
  
  applyCellStyle(ws4, {s:{r:1, c:1}, e:{r:1, c:20}}, 'greenHeader');
  applyCellStyle(ws4, {s:{r:2, c:1}, e:{r:1+s4Data.length, c:20}}, 'body');

  for (let R = 2; R <= 1 + s4Data.length; ++R) {
      const addrT = XLSX.utils.encode_cell({ r: R, c: 20 });
      if (ws4[addrT]) ws4[addrT].s = CURRENCY_STYLE;
  }
  
  autoFitColumns(ws4, 1, 3);
  setZoom(ws4);
  XLSX.utils.book_append_sheet(wb, ws4, "전체매출");

  // ------------------------------------------------------------------
  // Sheet 5: 기타 (동적 위치 계산 적용)
  // ------------------------------------------------------------------
  const ws5 = XLSX.utils.aoa_to_sheet([]);
  
  // 데이터 가져오기
  const recruitData = workLogs?.recruitments || [];
  const interviewData = workLogs?.interviews || [];

  // =================================================================
  // [1] 위치 계산 로직 (핵심)
  // =================================================================
  
  // 1. 섭외 건수 시작 행 (고정) : 4행 (Index 3)
  const recruitStartRowIdx = 3; 
  
  // 2. 섭외 건수 테이블의 높이 계산
  // 데이터가 없어도 최소 20줄은 확보해서 포맷 유지 (원하시면 숫자를 줄이거나 recruitData.length로만 하셔도 됩니다)
  const recruitHeight = Math.max(recruitData.length, 20); 
  
  // 3. 섭외 건수 끝나는 행 Index
  const recruitEndRowIdx = recruitStartRowIdx + recruitHeight;

  // 4. 면접 건수 시작 행 Index (섭외 끝 + 4칸 공백)
  // 예: 데이터가 20개면 24행에서 끝남 -> 면접은 28행(Index 27)부터 시작
  const interviewHeaderRowIdx = recruitEndRowIdx + 4; 
  const interviewStartRowIdx = interviewHeaderRowIdx + 2; // 데이터는 헤더 2칸 밑

  // 5. 면접 건수 테이블 높이 계산
  const interviewHeight = Math.max(interviewData.length, 10);
  const interviewEndRowIdx = interviewStartRowIdx + interviewHeight;


  // =================================================================
  // [2] 상단 고정 영역 (특이사항, 섭외 건수 헤더)
  // =================================================================
  
  // 특이사항 헤더
  XLSX.utils.sheet_add_aoa(ws5, [['상담사 특이사항', '','','']], {origin: "B2"});
  XLSX.utils.sheet_add_aoa(ws5, [['분야', '단계', '상담사명', '특이사항']], {origin: "B3"});

  // 섭외 건수 헤더
  XLSX.utils.sheet_add_aoa(ws5, [['섭외 건수', '','','']], {origin: "G2"});
  XLSX.utils.sheet_add_aoa(ws5, [['섭외 총 건수', '','']], {origin: "L2"});
  
  XLSX.utils.sheet_add_aoa(ws5, [['분야', '상담사명', '연락방식', '섭외진행상태']], {origin: "G3"});
  XLSX.utils.sheet_add_aoa(ws5, [['거절', '완료', 'TTL']], {origin: "L3"});


  // =================================================================
  // [3] 하단 동적 영역 (면접 건수 헤더)
  // =================================================================
  
  // 계산된 interviewHeaderRowIdx 위치에 헤더 삽입
  // 엑셀 주소 변환 (예: Row Index 27 -> "G28")
  const addrRecruitTitle = XLSX.utils.encode_cell({r: interviewHeaderRowIdx, c: 6}); // G열
  const addrRecruitStatTitle = XLSX.utils.encode_cell({r: interviewHeaderRowIdx, c: 11}); // L열
  
  const addrRecruitHead = XLSX.utils.encode_cell({r: interviewHeaderRowIdx + 1, c: 6});
  const addrRecruitStatHead = XLSX.utils.encode_cell({r: interviewHeaderRowIdx + 1, c: 11});

  XLSX.utils.sheet_add_aoa(ws5, [['면접 건수', '','','']], {origin: addrRecruitTitle});
  XLSX.utils.sheet_add_aoa(ws5, [['면접 총 건수', '','']], {origin: addrRecruitStatTitle});

  XLSX.utils.sheet_add_aoa(ws5, [['분야', '상담사명', '결과', '비고']], {origin: addrRecruitHead});
  XLSX.utils.sheet_add_aoa(ws5, [['합격', '불합격', 'TTL']], {origin: addrRecruitStatHead});


  // =================================================================
  // [4] 데이터 삽입
  // =================================================================

  // 1. 특이사항 데이터 (좌측)
  if (workLogs?.remarks?.length > 0) {
      const remarkData = workLogs.remarks.map(r => [r.category, r.level, r.name, r.note]);
      XLSX.utils.sheet_add_aoa(ws5, remarkData, { origin: "B4" });
  }

  // 2. 섭외 건수 데이터 (우측 상단)
  if (recruitData.length > 0) {
      const rData = recruitData.map(r => [r.category, r.name, r.contact, r.status]);
      XLSX.utils.sheet_add_aoa(ws5, rData, { origin: "G4" });
  }

  // 3. 면접 건수 데이터 (우측 하단 - 동적 위치)
  if (interviewData.length > 0) {
      const iData = interviewData.map(r => [r.category, r.name, r.result, r.note]);
      // 계산된 시작 위치에 삽입
      const addrDataStart = XLSX.utils.encode_cell({r: interviewStartRowIdx, c: 6});
      XLSX.utils.sheet_add_aoa(ws5, iData, { origin: addrDataStart });
  }


  // =================================================================
  // [5] 스타일링 (동적 범위 적용)
  // =================================================================

  // 1. 상단 헤더 스타일 (고정)
  applyCellStyle(ws5, {s:{r:1, c:1}, e:{r:1, c:4}}, 'greenHeader');
  applyCellStyle(ws5, {s:{r:2, c:1}, e:{r:2, c:4}}, 'greenHeader');
  applyCellStyle(ws5, {s:{r:1, c:6}, e:{r:1, c:9}}, 'greenHeader');
  applyCellStyle(ws5, {s:{r:2, c:6}, e:{r:2, c:9}}, 'greenHeader');
  applyCellStyle(ws5, {s:{r:1, c:11}, e:{r:1, c:13}}, 'greenHeader');
  applyCellStyle(ws5, {s:{r:2, c:11}, e:{r:2, c:13}}, 'greenHeader');

  // 2. 하단 헤더 스타일 (동적 위치)
  applyCellStyle(ws5, {s:{r:interviewHeaderRowIdx, c:6}, e:{r:interviewHeaderRowIdx, c:9}}, 'greenHeader');
  applyCellStyle(ws5, {s:{r:interviewHeaderRowIdx+1, c:6}, e:{r:interviewHeaderRowIdx+1, c:9}}, 'greenHeader');
  applyCellStyle(ws5, {s:{r:interviewHeaderRowIdx, c:11}, e:{r:interviewHeaderRowIdx, c:13}}, 'greenHeader');
  applyCellStyle(ws5, {s:{r:interviewHeaderRowIdx+1, c:11}, e:{r:interviewHeaderRowIdx+1, c:13}}, 'greenHeader');

  // 3. 본문 스타일 (데이터 길이에 맞춰 늘어남)
  // 특이사항: B4 ~ B(recruitEndRowIdx와 비슷하게 맞추거나 길게)
  // 여기선 특이사항도 섭외 건수 길이만큼 스타일 적용 (최소 50줄)
  const maxContentRowIdx = Math.max(recruitEndRowIdx, 53); 
  applyCellStyle(ws5, {s:{r:3, c:1}, e:{r:maxContentRowIdx, c:4}}, 'wrappedBody'); 

  // 섭외 건수 본문: G4 ~ 계산된 끝 행
  applyCellStyle(ws5, {s:{r:3, c:6}, e:{r:recruitEndRowIdx - 1, c:9}}, 'wrappedBody'); 
  applyCellStyle(ws5, {s:{r:3, c:11}, e:{r:3, c:13}}, 'body'); // 통계

  // 면접 건수 본문: 계산된 시작 ~ 계산된 끝
  applyCellStyle(ws5, {s:{r:interviewStartRowIdx, c:6}, e:{r:interviewEndRowIdx - 1, c:9}}, 'wrappedBody');
  applyCellStyle(ws5, {s:{r:interviewStartRowIdx, c:11}, e:{r:interviewStartRowIdx, c:13}}, 'body'); // 통계


  // =================================================================
  // [6] 셀 병합 & 수식 & 마무리
  // =================================================================
  
  ws5['!merges'] = [
    {s:{r:1, c:1}, e:{r:1, c:4}}, 
    {s:{r:1, c:6}, e:{r:1, c:9}}, 
    {s:{r:1, c:11}, e:{r:1, c:13}}, 
    
    // 동적 위치 병합
    {s:{r:interviewHeaderRowIdx, c:6}, e:{r:interviewHeaderRowIdx, c:9}}, 
    {s:{r:interviewHeaderRowIdx, c:11}, e:{r:interviewHeaderRowIdx, c:13}},
  ];

  // 수식 (동적 범위 적용)
  // 섭외 건수 통계 (데이터가 100개면 J104까지 체크하도록)
  // 엑셀은 1-based index이므로 +1 해줌
  const rEndExcel = recruitEndRowIdx; 
  XLSX.utils.sheet_add_aoa(ws5, [[
    { t: 'n', f: `COUNTIF(J4:J${rEndExcel}, "거절")` },
    { t: 'n', f: `COUNTIF(J4:J${rEndExcel}, "완료")` },
    { t: 'n', f: `COUNTA(G4:G${rEndExcel})` }
  ]], {origin: "L4"});

  // 면접 건수 통계
  const iStartExcel = interviewStartRowIdx + 1;
  const iEndExcel = interviewEndRowIdx;
  const addrInterviewStat = XLSX.utils.encode_cell({r: interviewStartRowIdx, c: 11});

  XLSX.utils.sheet_add_aoa(ws5, [[
    { t: 'n', f: `COUNTIF(I${iStartExcel}:I${iEndExcel}, "합격")` },
    { t: 'n', f: `COUNTIF(I${iStartExcel}:I${iEndExcel}, "불합격")` },
    { t: 'n', f: `COUNTA(G${iStartExcel}:G${iEndExcel})` }
  ]], {origin: addrInterviewStat});


  ws5['!cols'] = [
    {wch:2}, {wch:8}, {wch:8}, {wch:12}, {wch:40}, {wch:2},
    {wch:8}, {wch:12}, {wch:15}, {wch:20}, {wch:2},
    {wch:8}, {wch:8}, {wch:8}
  ];
  setZoom(ws5);
  XLSX.utils.book_append_sheet(wb, ws5, "기타");

  // ------------------------------------------------------------------
  // Sheet 6: 개인성과
  // ------------------------------------------------------------------
  const ws6 = XLSX.utils.aoa_to_sheet([]);
  XLSX.utils.sheet_add_aoa(ws6, [['* 개인이 진행한 업무내용을 작성해주세요.']], {origin: "B2"});
  XLSX.utils.sheet_add_aoa(ws6, [['- 성과가 있는 업무는 성과여부 체크 후 성과내용 자세하게 작성']], {origin: "B3"});
  XLSX.utils.sheet_add_aoa(ws6, [['번호', '업무범위', '업무내용', '성과여부', '성과내용']], {origin: "B4"});

  const s6Example = [[1, '상담실 운영', '① 상담사들의 정산 데이터 정리\n② 상담사 모집 및 등록\n③ 밀가 상담사/점장님 회의 진행', '②', '② 상담사 모집 후 총 0 명 등록 진행']];
  XLSX.utils.sheet_add_aoa(ws6, s6Example, {origin: "B5"});

  for(let k=0; k<10; k++) {
    XLSX.utils.sheet_add_aoa(ws6, [[k+2, '', '', '', '']], {origin: {r: 5+k, c: 1}});
  }

  ws6['!merges'] = [ { s: {r:1, c:1}, e: {r:1, c:5} }, { s: {r:2, c:1}, e: {r:2, c:5} } ];

  const titleStyle = { ...STYLES.body, font: { ...FONTS.header, sz: 12 }, border: {} };
  const addr1 = XLSX.utils.encode_cell({r:1, c:1});
  const addr2 = XLSX.utils.encode_cell({r:2, c:1});
  if(ws6[addr1]) ws6[addr1].s = { ...titleStyle, alignment: { horizontal: "center" } };
  if(ws6[addr2]) ws6[addr2].s = { ...titleStyle, alignment: { horizontal: "center" } };

  applyCellStyle(ws6, {s:{r:3, c:1}, e:{r:3, c:5}}, 'greenHeader'); 
  // [수정] 성과 보고도 줄바꿈이 필요하므로 wrappedBody 적용
  applyCellStyle(ws6, {s:{r:4, c:1}, e:{r:15, c:5}}, 'wrappedBody');

  ws6['!cols'] = [{wch:2}, {wch:6}, {wch:15}, {wch:45}, {wch:10}, {wch:45}];
  setZoom(ws6);
  XLSX.utils.book_append_sheet(wb, ws6, "개인성과");

  // ------------------------------------------------------------------
  // 다운로드 실행
  // ------------------------------------------------------------------
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/octet-stream' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${monthStr} 상담사매출확인.xlsx`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};