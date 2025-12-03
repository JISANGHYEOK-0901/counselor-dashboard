import * as XLSX from 'xlsx';

// ==========================================
// 1. 설정값 (광고/승급/정산비율)
// ==========================================
export const AD_CYCLES = {
  '그린': { '전화': { '메인': 4, '타로': 4, '사주': 2, '신점': 3 }, '채팅': { '메인': 2, '타로': 2, '사주': 1, '신점': 1 } },
  '퍼플': { '전화': { '메인': 6, '타로': 6, '사주': 2, '신점': 5 }, '채팅': { '메인': 2, '타로': 2, '사주': 1, '신점': 1 } }
};

const LEVEL_STANDARDS = {
    '그린1단계': { revenue: 300000, months: 1 }, '그린2단계': { revenue: 850000, months: 1 }, '그린3단계': { revenue: 2750000, months: 2 },
    '그린4단계': { revenue: 5000000, months: 2 }, '그린5단계': { revenue: 8000000, months: 2 }, '그린6단계': { revenue: 11000000, months: 3 },
    '퍼플1단계': { revenue: 600000, months: 1 }, '퍼플2단계': { revenue: 1600000, months: 2 }, '퍼플3단계': { revenue: 5200000, months: 2 },
    '퍼플4단계': { revenue: 9300000, months: 3 }, '퍼플5단계': { revenue: 14500000, months: 3 }, '퍼플6단계': { revenue: 21000000, months: 3 }
};

const SETTLEMENT_RATIOS = {
    '퍼플6단계': 0.70, '퍼플5단계': 0.66, '퍼플4단계': 0.62, '퍼플3단계': 0.58, '퍼플2단계': 0.54, '퍼플1단계': 0.50, '퍼플0단계': 0.45,
    '그린6단계': 0.70, '그린5단계': 0.66, '그린4단계': 0.62, '그린3단계': 0.58, '그린2단계': 0.54, '그린1단계': 0.50, '그린0단계': 0.45
};

// ==========================================
// 2. 파싱 헬퍼
// ==========================================
const normalize = (val) => String(val || '').replace(/\s+/g, '').trim();

const parseNum = (val) => {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return val;
  return parseFloat(String(val).replace(/[^0-9.-]/g, '')) || 0;
};

const parseTime = (val) => {
  if (!val) return 0;
  if (typeof val === 'number') return Math.round(val * 24 * 60); 
  const str = String(val).trim();
  const h = str.match(/(\d+)\s*시간/);
  const m = str.match(/(\d+)\s*분/);
  let minutes = 0;
  if (h) minutes += parseInt(h[1]) * 60;
  if (m) minutes += parseInt(m[1]);
  if (!h && !m) minutes = parseNum(str);
  return minutes;
};

const findVal = (row, ...candidates) => {
  if (!row) return undefined;
  const keys = Object.keys(row);
  for (const c of candidates) {
      const target = c.replace(/\s+/g, '').toLowerCase();
      const foundKey = keys.find(k => k.replace(/\s+/g, '').toLowerCase().includes(target));
      if (foundKey) return row[foundKey];
  }
  return undefined;
};

// [수정] 데이터 병합 로직 강화
const aggregateData = (rawData) => {
    if (!Array.isArray(rawData)) return [];
    const map = {};
    let lastMeta = { nick: '', realName: '', category: '-', levelCat: '-', levelVal: '', phone: '' };
    
    const cleanStr = (val) => String(val || '').trim();
    const normalizeLevel = (val) => String(val || '').replace(/\s+/g, '').trim();

    rawData.forEach(row => {
        let nick = normalize(findVal(row, '닉네임'));
        if (!nick) nick = lastMeta.nick; else lastMeta.nick = nick;
        if (!nick) return; 

        let realName = normalize(findVal(row, '이름', '실명'));
        if (!realName && nick === lastMeta.nick) realName = lastMeta.realName; else lastMeta.realName = realName;

        let category = cleanStr(findVal(row, '카테고리', '상담분야'));
        if (!category && nick === lastMeta.nick) category = lastMeta.category; else lastMeta.category = category;

        let rawLevelCat = row['단계'] || findVal(row, '등급분류', '단계(그린,퍼플)', '등급');
        let levelCat = normalizeLevel(rawLevelCat);
        if (!levelCat && nick === lastMeta.nick) levelCat = lastMeta.levelCat; else lastMeta.levelCat = levelCat;

        let levelVal = row['단계_1'] || findVal(row, '상세단계', '레벨', '단계');
        if (!levelVal && nick === lastMeta.nick) levelVal = lastMeta.levelVal; else lastMeta.levelVal = levelVal;

        let phone = findVal(row, '전화번호', '연락처');
        if (!phone && nick === lastMeta.nick) phone = lastMeta.phone; else lastMeta.phone = phone;

        if (!map[nick]) {
            map[nick] = {
                nick,
                realName: realName || nick,
                category: category || '-',
                levelCat: levelCat || '-',
                levelVal: levelVal,
                phone: phone || '',
                services: '',
                curRev: 0, curTime: 0, curMissed: 0, reviews: 0, answers: 0
            };
        }

        const entry = map[nick];
        entry.curRev += parseNum(findVal(row, '전체정산 금액', '전체정산금액', '전체정산'));
        entry.curTime += parseTime(findVal(row, '접속시간'));
        
        const coinFail = parseNum(findVal(row, '코인콜수 실패'));
        const phoneFail = parseNum(findVal(row, '060콜수 실패'));
        entry.curMissed += (coinFail + phoneFail);
        
        entry.reviews += parseNum(findVal(row, '후기수'));
        entry.answers += parseNum(findVal(row, '답변수'));
        
        const srv = findVal(row, '제공서비스', '서비스') || '';
        if (srv && !entry.services.includes(srv)) entry.services += `, ${srv}`;
    });

    return Object.values(map).map(row => {
        // [수정] 5번 요청: 미작성 후기가 음수가 되지 않도록 Math.max(0, ...) 적용
        row.unanswered = Math.max(0, row.reviews - row.answers);
        
        let ln = parseInt(String(row.levelVal || '').replace(/[^0-9]/g, '')) || 0;
        if (ln === 0 && row.levelCat) {
             ln = parseInt(String(row.levelCat).replace(/[^0-9]/g, '')) || 0;
        }
        
        if (row.levelCat.includes('그린')) row.levelCat = '그린';
        else if (row.levelCat.includes('퍼플')) row.levelCat = '퍼플';

        row.levelStr = `${ln}단계`;
        row.levelNum = ln;
        return row;
    });
};

// ==========================================
// 3. 데이터 읽기 (xls, xlsx, 구글시트 호환)
// ==========================================
export const readData = (input, type = 'file') => {
  return new Promise((resolve, reject) => {
    const processWorkbook = (wb) => {
      const ws = wb.Sheets[wb.SheetNames[0]];
      const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      let headerRowIndex = -1;
      
      for (let i = 0; i < Math.min(aoa.length, 50); i++) {
        const row = aoa[i];
        if (Array.isArray(row)) {
          const rowStr = row.map(cell => String(cell || '')).join('').replace(/\s+/g, '');
          if (rowStr.includes('닉네임')) {
            headerRowIndex = i;
            break;
          }
        }
      }

      if (headerRowIndex === -1) {
        throw new Error("데이터에서 '닉네임' 열을 찾을 수 없습니다.");
      }

      const rawHeaders = aoa[headerRowIndex];
      const uniqueHeaders = [];
      const headerCount = {};

      rawHeaders.forEach((h) => {
          let headerName = (h && typeof h === 'string') ? h.trim() : '';
          
          if (!headerName) {
              uniqueHeaders.push(`__EMPTY_${uniqueHeaders.length}`);
              return;
          }

          if (headerCount[headerName] === undefined) {
              headerCount[headerName] = 0;
              uniqueHeaders.push(headerName);
          } else {
              headerCount[headerName]++;
              uniqueHeaders.push(`${headerName}_${headerCount[headerName]}`);
          }
      });

      const rawData = [];
      for (let i = headerRowIndex + 1; i < aoa.length; i++) {
        const row = aoa[i];
        const obj = {};
        let hasData = false;
        
        uniqueHeaders.forEach((headerName, colIndex) => {
          if (!headerName.startsWith('__EMPTY')) {
            const val = row[colIndex];
            obj[headerName] = val;
            if (val !== undefined && val !== '' && val !== null) hasData = true;
          }
        });

        if (hasData) rawData.push(obj);
      }
      return rawData;
    };

    if (type === 'paste') {
      try {
        const wb = XLSX.read(input, { type: 'string' });
        resolve(processWorkbook(wb));
      } catch (err) { reject(err); }
    } else {
      const reader = new FileReader();
      reader.readAsArrayBuffer(input);
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(e.target.result, { type: 'array' });
          resolve(processWorkbook(wb));
        } catch (err) { reject(err); }
      };
      reader.onerror = (err) => reject(err);
    }
  });
};

// ==========================================
// 4. 주간 분석 (광고 자격 판별 로직 강화)
// ==========================================
export const processWeeklyAnalysis = (currentRaw, pastRaw = [], historyData = {}) => {
  const currentData = aggregateData(currentRaw || []);
  const pastData = aggregateData(pastRaw || []);

  const pastByRealName = {};
  const pastByNick = {};
  
  pastData.forEach(row => {
    if (row.realName) pastByRealName[row.realName] = row;
    if (row.nick) pastByNick[row.nick] = row;
  });

  let results = currentData.map(row => {
    const { nick, realName, category, levelCat, levelStr, levelNum, phone, curRev, curTime, curMissed, unanswered, services } = row;

    let prevRow = null;
    let remarks = [];
    let isNew = false;

    if (realName && pastByRealName[realName]) {
        prevRow = pastByRealName[realName];
        if (prevRow.nick !== nick) remarks.push(`활동명변경(${prevRow.nick} > ${nick})`);
    } else if (pastByNick[nick]) {
        prevRow = pastByNick[nick];
    } else {
        isNew = true;
        remarks.push(`신규상담사(${category}_${realName}_${nick}, ${phone})`);
    }

    const prevRev = prevRow ? prevRow.curRev : 0;
    const prevTime = prevRow ? prevRow.curTime : 0;
    const revDelta = curRev - prevRev;
    const timeDelta = curTime - prevTime;
    const calcRate = (c, p) => p === 0 ? (c > 0 ? 1 : 0) : ((c - p) / p);
    const revRate = prevRow ? calcRate(curRev, prevRev) : 0;
    const timeRate = prevRow ? calcRate(curTime, prevTime) : 0;

    const issues = [];
    if (prevRow && (prevTime - curTime >= 20 * 60)) issues.push('A');
    if (prevRow && prevRev > 0 && ((prevRev - curRev) / prevRev >= 0.1)) issues.push('B');
    if (curMissed >= 10) issues.push('C');
    if (unanswered >= 5) issues.push('D');

    const hasChat = String(services).includes('채팅') || String(services).toLowerCase().includes('chat');
    const adEligibleTypes = [];
    
    const isGreen = levelCat.includes('그린');
    const isPurple = levelCat.includes('퍼플');

    if ((isGreen || isPurple) && levelNum >= 1) {
        let catKey = '기타';
        if (category.includes('타로')) catKey = '타로';
        else if (category.includes('사주')) catKey = '사주';
        else if (category.includes('신점')) catKey = '신점';

        if (catKey !== '기타') {
            adEligibleTypes.push(`전화(${catKey})`);
            if (hasChat) adEligibleTypes.push(`채팅(${catKey})`);
            
            if (hasChat) adEligibleTypes.push('채팅(메인)');
            
            // [검증 완료] 2번 요청: 메인 광고 시간 기준 적용 (그린 30h, 퍼플 60h)
            let canPhoneMain = false;
            const hours = curTime / 60;
            
            if (levelNum >= 3) {
                canPhoneMain = true; // 3단계 이상은 시간 무관
            } else {
                // 그린/퍼플 여부에 따라 시간 기준 적용
                const limit = isPurple ? 60 : 30; // 퍼플 60시간, 그린 30시간
                if (hours >= limit) canPhoneMain = true;
            }
            
            if (canPhoneMain) adEligibleTypes.push('전화(메인)');
        }
    }

    return {
      nick, realName, category, levelCat, level: levelStr, levelNum,
      curRev, prevRev, revDelta, revRate,
      curTime, prevTime, timeDelta, timeRate,
      unanswered, curMissed,
      remarks: remarks.join(', ') || '-',
      issues, adEligibleTypes,
      status: isNew ? 'new' : 'existing'
    };
  }).filter(r => r !== null);

  const currentRealNames = new Set(results.map(r => r.realName));
  pastData.forEach(row => {
      const isRenamed = results.some(r => r.realName === row.realName);
      if (!currentRealNames.has(row.realName) && !isRenamed) {
          results.push({
              nick: row.nick, realName: row.realName, category: row.category, levelCat: row.levelCat, level: row.levelStr, levelNum: row.levelNum,
              curRev: 0, prevRev: row.curRev, revDelta: 0 - row.curRev, revRate: -1,
              curTime: 0, prevTime: row.curTime, timeDelta: 0 - row.curTime, timeRate: -1,
              unanswered: 0, curMissed: 0, remarks: '블라인드 상담사', issues: [], adEligibleTypes: [], status: 'blind'
          });
      }
  });

  return results;
};

// ==========================================
// 5. 월간 분석
// ==========================================
export const processMonthlyAnalysis = (thisMonth, lastMonth = []) => {
    const basicData = processWeeklyAnalysis(thisMonth, lastMonth);
    return basicData.map(row => {
        const issues = [];
        if (row.curMissed >= 10) issues.push('C(월간부재)'); 
        if (row.curTime < 60 * 60) issues.push('시간미달');

        let promotionStatus = '-';
        const nextLevelNum = row.levelNum + 1;
        
        const cleanLevelCat = row.levelCat.includes('퍼플') ? '퍼플' : '그린';
        const currentFullLevel = `${cleanLevelCat}${row.levelNum}단계`; 
        const nextFullLevel = `${cleanLevelCat}${nextLevelNum}단계`; 

        const ratio = SETTLEMENT_RATIOS[currentFullLevel] || 0.45;
        const mySettleAmount = Math.floor(row.curRev * ratio); 
        const mySettleAmountLast = Math.floor(row.prevRev * ratio);

        if (LEVEL_STANDARDS[nextFullLevel]) {
            const { revenue: targetRev, months: targetMonths } = LEVEL_STANDARDS[nextFullLevel];
            if (mySettleAmount >= targetRev) {
                if (targetMonths === 1) {
                    promotionStatus = `🚀 승급가능 (${nextFullLevel})`;
                } else {
                    if (mySettleAmountLast >= targetRev) {
                        promotionStatus = `🚀 승급가능 (2개월 유지완료)`;
                    } else {
                        promotionStatus = `⏳ 1달 달성 (필요:${targetMonths}개월)`;
                    }
                }
            } else {
                promotionStatus = `-${((targetRev - mySettleAmount)/10000).toFixed(0)}만 부족`;
            }
        } else if (row.levelNum >= 6) {
            promotionStatus = '👑 최고단계';
        }
        return { ...row, issues, promotionStatus, mySettle: mySettleAmount };
    });
};

// ==========================================
// 6. 성과 보고서
// ==========================================
export const processPerformanceReport = (currentRaw, pastRaw) => {
    const data = processWeeklyAnalysis(currentRaw, pastRaw);
    return data.map(row => {
        const { revRate, timeRate } = row;
        let reason = '-'; let goal = '-'; const noChange = 0.07; 

        if (row.status === 'blind') { reason = '블라인드 상담사'; goal = '-'; }
        else if (row.status === 'new') { reason = '신규 상담사'; goal = '플랫폼 이해, 규칙적 접속, 포스팅/공지사항 활용 고객확보 필요'; }
        else if (Math.abs(timeRate) <= noChange && Math.abs(revRate) <= noChange) { reason = '접속시간과 상담료 큰 차이없음'; goal = '본인의 규칙적인 접속시간을 고정하고 공지하며, 고객 1:1문의, 후기 답변등으로 단골 확보하여 매출 높일 수 있도록 목표 설정'; }
        else if (Math.abs(timeRate) <= noChange && revRate > 0) { reason = '접속시간 큰 차이 없으나 매출 증가'; goal = '지금과 같이 규칙적인 접속시간 유지 및 단골 확보하여 매출 높일 수 있도록 목표 설정 및 단계 상승을 위해 노력 필요'; }
        else if (Math.abs(timeRate) <= noChange && revRate < 0) { reason = '접속시간 큰 차이없으나 매출 하락'; goal = '접속시간은 유지하며 후기 작성, 부재중 관리하며 단골을 늘일 수 있도록 목표설정'; }
        else if (Math.abs(revRate) <= noChange && timeRate < 0) { reason = '접속시간 하락하였으나 매출 큰 차이 없음'; goal = '상담 인입이 줄어드는 추세로 본인의 규칙적인 접속시간 설정 및 포스팅 작성, 공지사항 안내를 통한 단골확보 필요'; }
        else if (revRate > 0 && timeRate > 0) { reason = '접속시간 증가로 인한 매출 증가'; goal = '지금과 같이 규칙적인 접속시간 유지 및 단골 확보하여 매출 높일 수 있도록 목표 설정'; }
        else if (revRate > 0 && timeRate < 0) { reason = '접속시간 하락하였으나 매출 증가'; goal = '접속시간 증가 필요, 규칙적인 접속시간 유지 및 단골 확보하여 매출 높일 수 있도록 목표 설정'; }
        else if (revRate < 0 && timeRate > 0) { reason = '접속시간 증가하였으나 매출 하락'; goal = '지속 접속하기보단 본인만의 규칙적인 접속시간 설정 및 공지가 필요하며 서비스 공지글 업데이트, 포스팅 작성 등을 통한 고객확보 필요'; }
        else if (revRate < 0 && timeRate < 0) { reason = '접속시간 하락으로 인한 매출하락'; goal = '접속시간 증가 필요, 서비스 공지글 업데이트, 포스팅 작성 등을 통한 고객확보 필요.'; }
        else { reason = '분석 필요'; goal = '개별 면담 필요'; }
        return { ...row, reason, goal };
    });
};

// ==========================================
// 7. 월매출 요약
// ==========================================
export const processRevenueSummary = (thisMonthRaw, lastMonthRaw) => {
    const analyzedCurrent = processWeeklyAnalysis(thisMonthRaw, lastMonthRaw);
    
    const blindList = analyzedCurrent.filter(r => r.status === 'blind').map(r => ({
        nick: r.nick,
        info: `블라인드상담사(${r.category}_${r.realName}_${r.nick}, ${r.levelCat} ${r.level})`,
        prevRev: r.prevRev
    }));

    const newList = analyzedCurrent.filter(r => r.status === 'new').map(r => ({
        nick: r.nick,
        info: r.remarks, 
        curRev: r.curRev
    }));

    const activeMembers = analyzedCurrent.filter(r => r.status !== 'blind');
    const totalRevThis = activeMembers.reduce((acc, r) => acc + r.curRev, 0);
    
    const lastMonthAgg = aggregateData(lastMonthRaw);
    const totalRevLast = lastMonthAgg.reduce((acc, r) => acc + r.curRev, 0);
    
    const growth = totalRevLast > 0 ? ((totalRevThis - totalRevLast) / totalRevLast) * 100 : 0;

    const existingCount = lastMonthAgg.length; 
    const newCount = analyzedCurrent.filter(r => r.status === 'new').length;
    const blindCount = blindList.length;

    return {
        totalRevThis, totalRevLast, growth,
        existingCount, newCount, blindCount, 
        blindList, newList, analyzedCurrent
    };
};