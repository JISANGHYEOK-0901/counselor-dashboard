import * as XLSX from 'xlsx-js-style';

// ==========================================
// 0. 스타일 및 설정 정의
// ==========================================
const FONTS = {
  header: { name: "가을체", sz: 11, bold: true },
  body: { name: "Arial", sz: 10 }
};

const COLORS = {
  purpleBg: { rgb: "7030A0" },    
  lightPurpleFg: { rgb: "E6E6FA" }, 
  greenBg: { rgb: "E2EFDA" },     
  blackFg: { rgb: "000000" },
  grayBorder: { rgb: "BFBFBF" },
  headerGray: { rgb: "E9ECEF" },
  blueBg: { rgb: "DCE6F1" },      
  blueFg: { rgb: "0000FF" },      
  redBg: { rgb: "FFC7CE" },       
  redFg: { rgb: "9C0006" }        
};

const THIN_BORDER = { style: "thin", color: { rgb: "BFBFBF" } };
const THICK_BORDER_STYLE = { style: "medium", color: { rgb: "000000" } };

const CURRENCY_STYLE = {
  font: { name: "Arial", sz: 10 },
  alignment: { vertical: "center", horizontal: "right" },
  border: { top: THIN_BORDER, bottom: THIN_BORDER, left: THIN_BORDER, right: THIN_BORDER },
  numFmt: '#,##0"원"' 
};

const STYLES = {
  purpleHeader: {
    fill: { fgColor: COLORS.purpleBg },
    font: { ...FONTS.header, color: COLORS.lightPurpleFg },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: { top: THIN_BORDER, bottom: THIN_BORDER, left: THIN_BORDER, right: THIN_BORDER }
  },
  greenHeader: {
    fill: { fgColor: COLORS.greenBg },
    font: { ...FONTS.header, color: COLORS.blackFg },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: { top: THIN_BORDER, bottom: THIN_BORDER, left: THIN_BORDER, right: THIN_BORDER }
  },
  body: {
    font: { ...FONTS.body },
    alignment: { vertical: "center", horizontal: "center" },
    border: { top: THIN_BORDER, bottom: THIN_BORDER, left: THIN_BORDER, right: THIN_BORDER }
  },
  wrappedBody: {
    font: { ...FONTS.body },
    alignment: { vertical: "top", horizontal: "center", wrapText: true }, 
    border: { top: THIN_BORDER, bottom: THIN_BORDER, left: THIN_BORDER, right: THIN_BORDER }
  },
  // [NEW] 왼쪽 정렬 스타일 (목표설정용, 들여쓰기 1칸 포함)
  leftAlignBody: {
    font: { ...FONTS.body },
    alignment: { vertical: "center", horizontal: "left", wrapText: true, indent: 1 }, 
    border: { top: THIN_BORDER, bottom: THIN_BORDER, left: THIN_BORDER, right: THIN_BORDER }
  },
  numberBody: {
    font: { ...FONTS.body },
    alignment: { vertical: "center", horizontal: "right" },
    border: { top: THIN_BORDER, bottom: THIN_BORDER, left: THIN_BORDER, right: THIN_BORDER }
  }
};

// [헬퍼] 테두리 덮어쓰기
const applyThickBorder = (ws, sR, sC, eR, eC) => {
    for (let r = sR; r <= eR; r++) {
        for (let c = sC; c <= eC; c++) {
            const addr = XLSX.utils.encode_cell({ r, c });
            if (!ws[addr]) ws[addr] = { t: 's', v: '' };

            if (!ws[addr].s) ws[addr].s = {};
            const currentStyle = { ...ws[addr].s };
            if (!currentStyle.border) currentStyle.border = { top: THIN_BORDER, bottom: THIN_BORDER, left: THIN_BORDER, right: THIN_BORDER };
            const currentBorder = { ...currentStyle.border };

            if (r === sR) currentBorder.top = THICK_BORDER_STYLE;
            if (r === eR) currentBorder.bottom = THICK_BORDER_STYLE;
            if (c === sC) currentBorder.left = THICK_BORDER_STYLE;
            if (c === eC) currentBorder.right = THICK_BORDER_STYLE;

            currentStyle.border = currentBorder;
            ws[addr].s = currentStyle;
        }
    }
};

// 자동 열 너비 계산
const autoFitColumns = (ws, headerRowIndex = 0, padding = 4) => {
  if (!ws['!ref']) return;
  const range = XLSX.utils.decode_range(ws['!ref']);
  const colWidths = [];

  for (let C = range.s.c; C <= range.e.c; ++C) {
    let maxLen = 0;
    const startRow = headerRowIndex > range.s.r ? headerRowIndex : range.s.r;
    
    for (let R = startRow; R <= range.e.r; ++R) {
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
    let finalWidth = Math.min(maxLen + padding, 60);

    // F열 ~ O열 너비 넉넉하게
    if (C >= 5 && C <= 14) {
        finalWidth = Math.max(finalWidth, 16);
    }
    // [NEW] 목표설정(14번 열)은 내용이 길어서 더 넓게 설정 (50)
    if (C === 14) {
        finalWidth = Math.max(finalWidth, 50);
    }

    colWidths[C] = { wch: finalWidth };
  }
  
  if (colWidths[0]) colWidths[0] = { wch: 18 }; 
  if (colWidths[12]) colWidths[12] = { wch: 22 };

  ws['!cols'] = colWidths;
};

const applyCellStyle = (ws, range, styleType) => {
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[addr]) ws[addr] = { t: 's', v: '' };
      
      const baseStyle = STYLES[styleType];
      ws[addr].s = { 
          ...baseStyle, 
          border: { ...baseStyle.border } 
      };
      
      if (styleType === 'body' && (typeof ws[addr].v === 'number' || String(ws[addr].v).includes('%'))) {
         ws[addr].s = { ...STYLES.numberBody, border: { ...STYLES.numberBody.border } };
      }
    }
  }
};

const setZoom = (ws) => {
  if (!ws['!views']) ws['!views'] = [];
  ws['!views'].push({ zoomScale: 80 });
};

const formatTime = (seconds) => {
  if (!seconds) return "0시간 00분 00초";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}시간 ${m.toString().padStart(2, '0')}분 ${s.toString().padStart(2, '0')}초`;
};

// ==========================================
// [NEW] 6개월 성과보고 전용 목표 자동생성 로직
// ==========================================
const getSixMonthGoalText = (row, isBlind) => {
  // 1. 블라인드 상담사는 무조건 빈칸
  if (isBlind) return "";

  // [핵심 수정] 들어오는 데이터가 문자열("5000")일 수도 있으므로 강제로 숫자로 변환
  // 콤마(,)가 포함된 문자열일 수도 있으니 제거 후 변환
  const parseNum = (val) => {
      if (val === null || val === undefined || val === '') return 0;
      if (typeof val === 'number') return val;
      // 문자열인 경우 콤마 제거 후 숫자 변환
      return Number(String(val).replace(/,/g, '')) || 0;
  };

  const avgRev = parseNum(row.avgRev);
  const level = parseNum(row.level);
  
  const revenues = Array.isArray(row.revenues) ? row.revenues : [];
  
  // 유효한 데이터만 필터링 (null/undefined/빈문자열 제외)
  const validRevs = revenues.filter(v => v !== null && v !== undefined && v !== '');

  // 데이터가 아예 없으면 빈칸
  if (validRevs.length === 0) return "";

  // 마지막 달과 그 전달 데이터도 안전하게 숫자로 변환
  const lastMonthRev = parseNum(validRevs[validRevs.length - 1]);
  const prevMonthRev = parseNum(validRevs[validRevs.length - 2]);

  // --- 로그 확인용 (필요시 주석 해제) ---
  // console.log(`Nick: ${row.nick}, Last: ${lastMonthRev}, Prev: ${prevMonthRev}, Avg: ${avgRev}, Level: ${level}`);

  // [우선순위 1] 매출 우상향 (지난달보다 이번달이 큼)
  if (lastMonthRev > prevMonthRev) {
    return "지금과 같이 규칙적인 접속시간 유지 및 단골 확보하여 매출 높일 수 있도록 목표 설정";
  }
  
  // [우선순위 2] 매출 하락 (지난달보다 이번달이 작음)
  if (lastMonthRev < prevMonthRev) {
    return "접속시간, 부재중 모니터링 및 상담 노하우 팁 전달 예정";
  }

  // [우선순위 3] 0단계 상담사
  if (level === 0) {
    return "접속시간 증가 필요, 규칙적인 접속시간 유지 및 단골 확보하여 매출 높일 수 있도록 목표설정";
  }

  // [우선순위 4] 1~2단계 상담사
  if (level >= 1 && level <= 2) {
    return "접속시간 증가 및 단골 형성, 매출 상승을 통해 단계 승급할 수 있도록 목표 설정";
  }

  // [우선순위 5] 고수익자 (월평균 500만원 이상)
  if (avgRev >= 5000000) {
    return "지금과 같이 규칙적인 접속시간 유지, 후기와 단골 관리를 통해 매출 상향";
  }

  // [우선순위 6] 나머지
  return "접속시간 증가, 주 고객들이 활동하는 출근, 점심, 퇴근 이후 시간대 활동, 포스팅 작성을 통한 고객 유입, 부재중 관리";
};
// ==========================================
// 1. 월간 리포트 생성 함수 (기존 로직 유지)
// ==========================================
export const generateMonthlyReportExcel = (analyzedCurrent, analyzedPast, targetMonth, userMemo = {}, workLogs = null) => {
  const wb = XLSX.utils.book_new();
  const currentMonthNum = parseInt(targetMonth);
  const prevMonthNum = currentMonthNum === 1 ? 12 : currentMonthNum - 1;
  const monthStr = `${currentMonthNum}월`;
  const prevMonthStr = `${prevMonthNum}월`;

  const s1Header = ['분야', '단계', '단계', '닉네임', `${prevMonthStr} 접속시간`, `${monthStr} 접속시간`, '접속 증감률', `${prevMonthStr} 전체정산금액`, `${monthStr} 전체정산금액`, '정산 증감률', '증감액', '증감사유', '목표설정'];
  const s1Data = [];
  const mergeText = '증액,하락\n통합\n(전체상담사)\n단계별로 정렬';
  
  analyzedCurrent.forEach((row, i) => {
    s1Data.push([
      i === 0 ? mergeText : '', 
      row.category || '-', row.levelCat || '-', row.level || '-', row.nick,
      formatTime(row.prevTime), formatTime(row.curTime), (row.timeRate * 100).toFixed(1) + '%',
      row.prevRev || 0, row.curRev || 0, (row.revRate * 100).toFixed(1) + '%',
      (row.curRev || 0) - (row.prevRev || 0), 
      row.reason || '-', 
      row.goal || '-'
    ]);
  });

  const ws1 = XLSX.utils.aoa_to_sheet([[''], ['', ...s1Header], ...s1Data]);
  XLSX.utils.sheet_add_aoa(ws1, [[monthStr]], { origin: "A2" });
  const ws1Range = XLSX.utils.decode_range(ws1['!ref']);
  applyCellStyle(ws1, {s: {r:1, c:1}, e: {r:1, c:13}}, 'purpleHeader');
  applyCellStyle(ws1, {s: {r:2, c:0}, e: ws1Range.e}, 'body');
  const aColStyle = { ...STYLES.body, alignment: { horizontal: "center", vertical: "center", wrapText: true } };
  for(let r=2; r<=9; r++) { const addr = XLSX.utils.encode_cell({r, c:0}); if(ws1[addr]) ws1[addr].s = aColStyle; }
  ws1['!merges'] = [{ s: {r:2, c:0}, e: {r:9, c:0} }];
  for (let R = 2; R <= ws1Range.e.r; ++R) { [8, 9, 11].forEach(C => { const addr = XLSX.utils.encode_cell({ r: R, c: C }); if (ws1[addr]) ws1[addr].s = CURRENCY_STYLE; }); }
  autoFitColumns(ws1, 1, 5);
  setZoom(ws1);
  XLSX.utils.book_append_sheet(wb, ws1, "매출 증감");

  // Sheet 2, 3 (기존 로직 유지)
  const partnerRows = []; let targetYM = 0; let targetDateStr = ""; 
  analyzedCurrent.forEach(row => { const m = String(row.memo || ""); const match = m.match(/(\d{2}\.\d{2})월.*파트너/); if(match) { const dateStr = match[1]; const parts = dateStr.split('.'); const currentVal = parseInt(parts[0]) * 100 + parseInt(parts[1]); if(currentVal > targetYM) { targetYM = currentVal; targetDateStr = dateStr; } } });
  if(targetDateStr) { analyzedCurrent.forEach(row => { const m = String(row.memo || ""); if(m.includes(targetDateStr) && m.includes('파트너')) { partnerRows.push([row.category, row.levelCat, row.level, row.nick, '-', targetDateStr, formatTime(row.curSettleTime), row.curRev || 0, '']); } }); }
  if(partnerRows.length > 0) partnerRows[0][8] = partnerRows.length+'명'; else partnerRows.push(['', '', '', '', '', '대상 없음', '', '', '']);
  
  const blindRows = analyzedCurrent.filter(r => r.status === 'blind').map((r, i) => [monthStr, r.category, r.levelCat, r.level, r.nick, userMemo[r.nick] || '미활동', i===0 ? (analyzedCurrent.filter(x=>x.status==='blind').length+'명') : '']);
  if(blindRows.length === 0) blindRows.push(['', '', '', '', '', '대상 없음', '']);
  
  const newRows = analyzedCurrent.filter(r => r.status === 'new').map((r, i) => [monthStr, r.category, r.levelCat, r.level, r.nick, userMemo[r.nick] || '-', i===0 ? (analyzedCurrent.filter(x=>x.status==='new').length+'명') : '']);
  if(newRows.length === 0) newRows.push(['', '', '', '', '', '대상 없음', '']);
  
  const ws3 = XLSX.utils.aoa_to_sheet([]);
  let currRow = 1;
  const pTitle = targetDateStr ? `■ 파트너 계약 상담사 (${targetDateStr}월 적용)` : `■ 파트너 계약 상담사`;
  XLSX.utils.sheet_add_aoa(ws3, [[pTitle]], {origin: {r: currRow++, c: 1}});
  XLSX.utils.sheet_add_aoa(ws3, [['분야', '등록단계', '단계', '활동명', '등록일', '계약일', '전체정산', '정산금액', 'TTL']], {origin: {r: currRow, c: 1}});
  applyCellStyle(ws3, {s:{r:currRow, c:1}, e:{r:currRow, c:9}}, 'greenHeader'); currRow++;
  XLSX.utils.sheet_add_aoa(ws3, partnerRows, {origin: {r: currRow, c: 1}});
  applyCellStyle(ws3, {s:{r:currRow, c:1}, e:{r:currRow + partnerRows.length - 1, c:9}}, 'body');
  for(let i=0; i<partnerRows.length; i++) { const addr = XLSX.utils.encode_cell({r: currRow+i, c: 8}); if(ws3[addr]) ws3[addr].s = CURRENCY_STYLE; }
  currRow += partnerRows.length + 2;
  
  XLSX.utils.sheet_add_aoa(ws3, [['■ 블라인드 상담사']], {origin: {r: currRow++, c: 1}});
  XLSX.utils.sheet_add_aoa(ws3, [['월', '분야', '단계', '단계', '활동명', '사유', 'TTL']], {origin: {r: currRow, c: 1}});
  applyCellStyle(ws3, {s:{r:currRow, c:1}, e:{r:currRow, c:7}}, 'greenHeader'); currRow++;
  XLSX.utils.sheet_add_aoa(ws3, blindRows, {origin: {r: currRow, c: 1}});
  applyCellStyle(ws3, {s:{r:currRow, c:1}, e:{r:currRow + blindRows.length - 1, c:7}}, 'body');
  currRow += blindRows.length + 2;
  
  XLSX.utils.sheet_add_aoa(ws3, [['■ 신규 상담사']], {origin: {r: currRow++, c: 1}});
  XLSX.utils.sheet_add_aoa(ws3, [['월', '분야', '등록단계', '단계', '활동명', '등록일', 'TTL']], {origin: {r: currRow, c: 1}});
  applyCellStyle(ws3, {s:{r:currRow, c:1}, e:{r:currRow, c:7}}, 'greenHeader'); currRow++;
  XLSX.utils.sheet_add_aoa(ws3, newRows, {origin: {r: currRow, c: 1}});
  applyCellStyle(ws3, {s:{r:currRow, c:1}, e:{r:currRow + newRows.length - 1, c:7}}, 'body');
  autoFitColumns(ws3, 0, 4); setZoom(ws3);
  XLSX.utils.book_append_sheet(wb, ws3, "파트너,블라인드,신규");

  const ws6 = XLSX.utils.aoa_to_sheet([]);
  XLSX.utils.sheet_add_aoa(ws6, [['* 개인이 진행한 업무내용을 작성해주세요.']], {origin: "B2"});
  XLSX.utils.sheet_add_aoa(ws6, [['- 성과가 있는 업무는 성과여부 체크 후 성과내용 자세하게 작성']], {origin: "B3"});
  XLSX.utils.sheet_add_aoa(ws6, [['번호', '업무범위', '업무내용', '성과여부', '성과내용']], {origin: "B4"});
  const s6Example = [[1, '상담실 운영', '① 상담사들의 정산 데이터 정리\n② 상담사 모집 및 등록\n③ 밀가 상담사/점장님 회의 진행', '②', '② 상담사 모집 후 총 0 명 등록 진행']];
  XLSX.utils.sheet_add_aoa(ws6, s6Example, {origin: "B5"});
  for(let k=0; k<10; k++) { XLSX.utils.sheet_add_aoa(ws6, [[k+2, '', '', '', '']], {origin: {r: 5+k, c: 1}}); }
  ws6['!merges'] = [ { s: {r:1, c:1}, e: {r:1, c:5} }, { s: {r:2, c:1}, e: {r:2, c:5} } ];
  const titleStyle = { ...STYLES.body, font: { ...FONTS.header, sz: 12 }, border: {} };
  const addr1 = XLSX.utils.encode_cell({r:1, c:1}); const addr2 = XLSX.utils.encode_cell({r:2, c:1});
  if(ws6[addr1]) ws6[addr1].s = { ...titleStyle, alignment: { horizontal: "center" } }; if(ws6[addr2]) ws6[addr2].s = { ...titleStyle, alignment: { horizontal: "center" } };
  applyCellStyle(ws6, {s:{r:3, c:1}, e:{r:3, c:5}}, 'greenHeader'); applyCellStyle(ws6, {s:{r:4, c:1}, e:{r:15, c:5}}, 'wrappedBody');
  ws6['!cols'] = [{wch:2}, {wch:6}, {wch:15}, {wch:45}, {wch:10}, {wch:45}];
  setZoom(ws6); XLSX.utils.book_append_sheet(wb, ws6, "개인성과");

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/octet-stream' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${monthStr} 상담사매출확인.xlsx`;
  document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(url); document.body.removeChild(a);
};

// ==========================================
// 2. 6개월 성과보고 엑셀 생성 함수
// ==========================================
export const generateSixMonthExcel = (originalData, year, half, monthLabels) => {
    const wb = XLSX.utils.book_new();
    const sheetName = `${year}년 ${half === '1' ? '상반기' : '하반기'} 성과보고`;
    const titleText = `${year}년 ${half === '1' ? '상반기' : '하반기'}`; 

    const ws = XLSX.utils.aoa_to_sheet([]);


    
    // [Step 1] 블라인드 여부 판별 및 데이터 준비
    const processedData = originalData.map(r => {
        // 배열 안전 처리 (null이 올 수도 있으므로 원본 유지)
        const revenues = Array.isArray(r.revenues) ? r.revenues : [];
        const totalRev = r.totalRev || 0;
        
        // [중요 수정] 블라인드 로직:
        // 1. 총 매출(totalRev)은 0보다 큼 (즉, 이전에 활동 기록이 있었음)
        // 2. 그러나, 마지막 달(revenues의 마지막 요소)의 데이터가 'undefined' 혹은 'null' 임.
        //    (주의: 0은 활동한 것이므로 블라인드가 아님. 데이터가 아예 없는 경우만 체크)
        const lastVal = revenues[revenues.length - 1];
        
        const isDataMissing = (lastVal === undefined || lastVal === null || lastVal === ""); 
        const isBlind = (totalRev > 0 && isDataMissing) || (r.nick && String(r.nick).includes('블라인드'));

        return { ...r, isBlind, revenues };
    });

    // [Step 2] 정렬: 일반 상담사 -> 블라인드 상담사(맨 뒤)
    const data = processedData.sort((a, b) => {
        if (a.isBlind && !b.isBlind) return 1;  // A가 블라인드면 뒤로
        if (!a.isBlind && b.isBlind) return -1; // B가 블라인드면 뒤로
        return 0; // 같으면 유지
    });

    const noticeText = "* 상담사 별 최고 매출액, 최저 매출액 음영표시 (최고:빨강/최저:파랑)";
    XLSX.utils.sheet_add_aoa(ws, [[noticeText]], { origin: "B2" });

    const headers = [
        titleText, 
        '분야', '단계', '단계', '활동명',
        ...monthLabels.map(m => `${m} 전체정산 금액`), 
        '평균 월매출', `${titleText.split(' ')[1]} 총합`, 
        '상담사 특이사항', `${half === '1' ? '하반기' : '내년 상반기'} 목표설정`
    ];
    XLSX.utils.sheet_add_aoa(ws, [headers], { origin: "A4" });

    // 데이터 삽입
    const rows = data.map(r => {
        const safeNick = r.nick ? String(r.nick).trim() : "";
        
        // 목표설정 자동 생성 (블라인드는 빈칸)
        const goalText = getSixMonthGoalText(r, r.isBlind);
        const noteText = r.isBlind ? '블라인드 상담사' : '';

        // 엑셀에 뿌려줄 때는 null/undefined를 0이나 빈칸으로 처리해야 함
        // (안 그러면 엑셀파일이 깨질 수 있음)
        const displayRevenues = (Array.isArray(r.revenues) ? r.revenues : []).map(v => (v === null || v === undefined) ? 0 : v);
        // 만약 monthLabels 길이보다 부족하면 0으로 채움
        while(displayRevenues.length < monthLabels.length) {
            displayRevenues.push(0);
        }

        return [
            '', // A열 병합용
            r.category || '-',
            r.levelCat || '-',
            r.level || '-',
            safeNick,
            ...displayRevenues,
            r.avgRev || 0,
            r.totalRev || 0,
            noteText, // 특이사항
            goalText  // 목표설정
        ];
    });
    XLSX.utils.sheet_add_aoa(ws, rows, { origin: "A5" });

    // --- 스타일링 로직 ---
    
    const noticeStyle = {
        fill: { fgColor: { rgb: "FF0000" } }, 
        font: { name: "Arial", sz: 10, color: { rgb: "FFFFFF" }, bold: true }, 
        alignment: { horizontal: "center", vertical: "center" },
        border: {} 
    };
    ws['!merges'] = [
        { s: { r: 1, c: 1 }, e: { r: 1, c: 9 } }, 
        { s: { r: 4, c: 0 }, e: { r: 11, c: 0 } }
    ];
    const noticeAddr = XLSX.utils.encode_cell({ r: 1, c: 1 });
    if (!ws[noticeAddr]) ws[noticeAddr] = { t: 's', v: noticeText };
    ws[noticeAddr].s = noticeStyle;

    const aColAddr = XLSX.utils.encode_cell({ r: 4, c: 0 });
    if (!ws[aColAddr]) ws[aColAddr] = { t: 's', v: '' };
    ws[aColAddr].v = "증액,하락\n통합\n(전체상담사)\n단계별로 정렬\n(0단계부터)";
    ws[aColAddr].s = { 
        ...STYLES.body, 
        alignment: { horizontal: "center", vertical: "center", wrapText: true } 
    };

    applyCellStyle(ws, { s: { r: 3, c: 0 }, e: { r: 3, c: 14 } }, 'greenHeader');
    applyThickBorder(ws, 3, 0, 3, 14);

    const START_REV_COL = 5;
    const END_REV_COL = 10;
    const END_ROW_IDX = 4 + rows.length - 1;

    data.forEach((row, idx) => {
        const rowIdx = 4 + idx; 
        
        // 스타일링을 위한 유효값 체크 (0은 포함, null/undefined 제외)
        const revenues = Array.isArray(row.revenues) ? row.revenues : [];
        const validRevs = revenues.map((v, i) => ({ v: (v === null || v === undefined) ? 0 : v, i }))
                                  .filter(o => o.v > 0); // 색상 강조는 0보다 큰 값 기준

        let maxIdx = -1, minIdx = -1;
        if (validRevs.length > 0) {
            const maxVal = Math.max(...validRevs.map(o => o.v));
            const minVal = Math.min(...validRevs.map(o => o.v));
            maxIdx = validRevs.find(o => o.v === maxVal).i;
            minIdx = validRevs.find(o => o.v === minVal).i;
        }

        for (let c = 0; c <= 14; c++) {
            const addr = XLSX.utils.encode_cell({ r: rowIdx, c: c });
            if (!ws[addr]) ws[addr] = { t: 's', v: '' };

            if (c === 0 && rowIdx <= 11) continue;

            // 기본 스타일 적용
            ws[addr].s = STYLES.body;

            // [NEW] 목표설정(14번 열)은 왼쪽 정렬 스타일 적용!
            if (c === 14) {
                 ws[addr].s = STYLES.leftAlignBody;
            }

            // 금액 서식 적용 (매출액 컬럼 + 평균 + 합계)
            if (c >= START_REV_COL && c <= 12) { 
                ws[addr].s = { ...ws[addr].s, ...CURRENCY_STYLE, border: ws[addr].s.border };
            }

            // 최대/최소 매출액 색상 강조
            if (c >= START_REV_COL && c <= END_REV_COL) {
                const monthIndex = c - START_REV_COL;
                if (monthIndex === maxIdx) {
                    ws[addr].s = { ...ws[addr].s, fill: { fgColor: COLORS.redBg }, font: { ...FONTS.body, color: COLORS.redFg } }; 
                } else if (monthIndex === minIdx) {
                    ws[addr].s = { ...ws[addr].s, fill: { fgColor: COLORS.blueBg }, font: { ...FONTS.body, color: COLORS.blueFg } }; 
                }
            }
        }
    });

    applyThickBorder(ws, 4, 1, END_ROW_IDX, 14);
    applyThickBorder(ws, 4, 0, 11, 0);

    autoFitColumns(ws, 3, 2);
    setZoom(ws);

    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sheetName}.xlsx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
};