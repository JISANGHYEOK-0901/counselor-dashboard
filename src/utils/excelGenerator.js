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

// 기본 얇은 테두리
const THIN_BORDER = { style: "thin", color: { rgb: "BFBFBF" } };
// 굵은 테두리 (검정)
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
            // [수정] 빈 셀이라도 테두리를 그리기 위해 셀 생성
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

    // [수정 요청 2번] F열(Index 5) ~ O열(Index 14) 너비 넉넉하게 설정 (최소 16)
    if (C >= 5 && C <= 14) {
        finalWidth = Math.max(finalWidth, 16);
    }

    colWidths[C] = { wch: finalWidth };
  }
  
  // A열 너비 고정
  if (colWidths[0]) colWidths[0] = { wch: 18 }; 
  // M열(평균) 너비 고정
  if (colWidths[12]) colWidths[12] = { wch: 22 };

  ws['!cols'] = colWidths;
};

const applyCellStyle = (ws, range, styleType) => {
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[addr]) ws[addr] = { t: 's', v: '' }; // 빈 셀 생성
      
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
// 메인 생성 함수 (기존 월간 리포트 - 유지)
// ==========================================
export const generateMonthlyReportExcel = (analyzedCurrent, analyzedPast, targetMonth, userMemo = {}, workLogs = null) => {
  // ... (기존 generateMonthlyReportExcel 코드 내용은 수정 없이 그대로 유지) ...
  // 너무 길어 생략하지만, 기존에 잘 동작하던 코드는 그대로 두시면 됩니다.
  // 이 함수는 요청하신 6개월 리포트와 무관하므로 위 코드 블록들만 교체해주셔도 됩니다.
  // 다만 전체 파일 덮어쓰기를 원하시면 이전에 드린 코드의 이 부분도 포함해야 합니다.
  // 편의를 위해 아래에 짧게 축약하지 않고 그대로 둡니다.
  
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
      (row.curRev || 0) - (row.prevRev || 0), row.reason || '-', row.goal || '-' 
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

  // Sheet 2, 3 (생략 없이 기존 로직 그대로 사용)
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
// [NEW] 6개월 성과보고 엑셀 생성 함수 (수정됨)
// ==========================================
export const generateSixMonthExcel = (data, year, half, monthLabels) => {
    const wb = XLSX.utils.book_new();
    const sheetName = `${year}년 ${half === '1' ? '상반기' : '하반기'} 성과보고`;
    const titleText = `${year}년 ${half === '1' ? '상반기' : '하반기'}`; 

    const ws = XLSX.utils.aoa_to_sheet([]);

    // 1. 안내 문구 (B2:J2)
    const noticeText = "* 상담사 별 최고 매출액, 최저 매출액 음영표시 (최고:빨강/최저:파랑)";
    XLSX.utils.sheet_add_aoa(ws, [[noticeText]], { origin: "B2" });

    // 2. 헤더 (A4)
    const headers = [
        titleText, 
        '분야', '단계', '단계', '활동명',
        ...monthLabels.map(m => `${m} 전체정산 금액`), 
        '평균 월매출', `${titleText.split(' ')[1]} 총합`, 
        '상담사 특이사항', `${half === '1' ? '하반기' : '내년 상반기'} 목표설정`
    ];
    XLSX.utils.sheet_add_aoa(ws, [headers], { origin: "A4" });

    // 3. 데이터 삽입
    const rows = data.map(r => {
        return [
            '', // A열 병합용
            r.category,
            r.levelCat,
            r.level,
            r.nick,
            ...r.revenues, // 6개월 매출
            r.avgRev,
            r.totalRev,
            '', 
            '' 
        ];
    });
    XLSX.utils.sheet_add_aoa(ws, rows, { origin: "A5" });

    // ==========================================
    // 스타일링 적용
    // ==========================================

    // 1. 안내 문구 스타일 (B2:J2)
    const noticeStyle = {
        fill: { fgColor: { rgb: "FF0000" } }, 
        font: { name: "Arial", sz: 10, color: { rgb: "FFFFFF" }, bold: true }, 
        alignment: { horizontal: "center", vertical: "center" },
        border: {} 
    };
    ws['!merges'] = [
        { s: { r: 1, c: 1 }, e: { r: 1, c: 9 } }, 
        // [수정 요청 2번] A열 병합 범위 제한 (5행 ~ 12행, index: 4~11)
        { s: { r: 4, c: 0 }, e: { r: 11, c: 0 } }
    ];
    const noticeAddr = XLSX.utils.encode_cell({ r: 1, c: 1 });
    if (!ws[noticeAddr]) ws[noticeAddr] = { t: 's', v: noticeText };
    ws[noticeAddr].s = noticeStyle;

    // 2. A열 병합 텍스트 (A5)
    const aColAddr = XLSX.utils.encode_cell({ r: 4, c: 0 }); // A5
    if (!ws[aColAddr]) ws[aColAddr] = { t: 's', v: '' }; // 만약 없으면 생성
    ws[aColAddr].v = "증액,하락\n통합\n(전체상담사)\n단계별로 정렬\n(0단계부터)";
    ws[aColAddr].s = { 
        ...STYLES.body, 
        alignment: { horizontal: "center", vertical: "center", wrapText: true } 
    };

    // 3. 헤더 스타일 (A4:O4)
    applyCellStyle(ws, { s: { r: 3, c: 0 }, e: { r: 3, c: 14 } }, 'greenHeader');
    // [수정 요청 3번] 헤더 전체 굵은 테두리
    applyThickBorder(ws, 3, 0, 3, 14);

    // 4. 본문 스타일 및 최고/최저 음영
    const START_REV_COL = 5;
    const END_REV_COL = 10;
    const END_ROW_IDX = 4 + rows.length - 1;

    data.forEach((row, idx) => {
        const rowIdx = 4 + idx; 
        
        // 최고/최저값 찾기
        const validRevs = row.revenues.map((v, i) => ({ v, i })).filter(o => o.v > 0);
        let maxIdx = -1, minIdx = -1;
        if (validRevs.length > 0) {
            const maxVal = Math.max(...validRevs.map(o => o.v));
            const minVal = Math.min(...validRevs.map(o => o.v));
            maxIdx = validRevs.find(o => o.v === maxVal).i;
            minIdx = validRevs.find(o => o.v === minVal).i;
        }

        for (let c = 0; c <= 14; c++) {
            const addr = XLSX.utils.encode_cell({ r: rowIdx, c: c });
            // [수정 요청 1번] 빈 셀도 테두리를 그리기 위해 강제 생성
            if (!ws[addr]) ws[addr] = { t: 's', v: '' };

            if (c === 0 && rowIdx <= 11) continue; // A열 병합 구간 건너뜀

            ws[addr].s = STYLES.body;

            if (c >= START_REV_COL && c <= 12) { 
                ws[addr].s = CURRENCY_STYLE;
            }

            if (c >= START_REV_COL && c <= END_REV_COL) {
                const monthIndex = c - START_REV_COL;
                if (monthIndex === maxIdx) {
                    ws[addr].s = { ...CURRENCY_STYLE, fill: { fgColor: COLORS.redBg }, font: { color: COLORS.redFg } }; 
                } else if (monthIndex === minIdx) {
                    ws[addr].s = { ...CURRENCY_STYLE, fill: { fgColor: COLORS.blueBg }, font: { color: COLORS.blueFg } }; 
                }
            }
        }
    });

    // [수정 요청 4번] 데이터 전체 영역(B5 ~ O끝) 굵은 바깥 테두리
    // A열은 병합되어 별도이므로 B열(1)부터 시작
    applyThickBorder(ws, 4, 1, END_ROW_IDX, 14);
    // A열 병합 구역 굵은 테두리
    applyThickBorder(ws, 4, 0, 11, 0);

    // 열 너비 계산
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