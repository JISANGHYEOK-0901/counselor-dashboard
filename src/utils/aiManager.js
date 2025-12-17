// src/utils/aiManager.js

// 1. 운영 매뉴얼 지식 베이스 (규정 준수 및 톤앤매너 수정됨)
const KNOWLEDGE_BASE = {
  // [이슈: 후기 미작성]
  review: [
    "고객님들은 상담 내용만큼이나 선생님의 정성스러운 후기 답변을 기다립니다. 답변은 재방문을 유도하는 가장 강력하고 안전한 수단입니다.",
    "상담 시간에 미처 다하지 못한 이야기나, 추가적인 공수(기도 등)를 댓글로 남겨주시면 고객 감동으로 이어집니다.",
    "후기 답변은 단순한 감사가 아니라 상담의 연장선입니다. 여운을 남겨주시면 고객님이 다시 찾아올 확률이 높아집니다."
  ],
  // [이슈: 매출 하락 / 리드 부족]
  revenue_low: [
    "상담 초반에 결론부터 명확히 말씀해주시고 부연 설명을 하는 '두괄식 화법'을 사용해보세요. 신뢰도가 높아집니다.",
    "고객의 힘든 상황에 깊이 공감해주시는 것만으로도 라포가 형성되어, 고객님이 스스로 상담을 더 이어가고 싶어 하게 됩니다.",
    "듣기만 하는 상담보다는, 질문을 던지며 상담을 주도적으로 리드해보시는 것을 추천드립니다."
  ],
  // [이슈: 재상담 유도] - (선연락 금지 -> 수동적 유인)
  retention: [
    "상담 마무리 시점에 '흐름이 바뀌는 시기(예: 다음 달 초)'를 구체적으로 언급해 주시면, 고객님이 해당 시기에 잊지 않고 다시 찾아옵니다.",
    "상담사 공지사항이나 프로필 상태 메시지를 주기적으로 업데이트하여, 단골 고객님들에게 활동 중임을 알려주세요.",
    "대기 상태를 꾸준히 유지해 주시면, 알림을 설정해둔 단골 고객님들이 접속을 확인하고 들어오게 됩니다."
  ],
  // [이슈: 접속 시간 부족]
  time_low: [
    "규칙적인 접속 시간은 고객과의 무언의 약속입니다. 특정 시간대를 정해 꾸준히 자리를 지켜주시면 고정 고객이 생깁니다.",
    "접속 시간이 불규칙하면 고객님들이 선생님을 찾다가 이탈하게 됩니다. '나만의 영업 시간'을 정해 공지해 보세요."
  ]
};

// 2. 톤앤매너 보정 (금지어 필터링)
const refineText = (text) => {
  let refined = text;
  refined = refined.replace(/가이드에 따르면/g, "성공적인 사례를 보면");
  refined = refined.replace(/지갑이 열립니다/g, "고객님이 마음을 열고 상담에 더 몰입하게 됩니다");
  refined = refined.replace(/돈을 씁니다/g, "상담을 이어가게 됩니다");
  refined = refined.replace(/매출을 올리려면/g, "더 좋은 성과를 내시려면");
  return refined;
};

// 3. 상황별 맞춤형 스크립트 생성기 (MessageModal용)
export const generateAiAdvice = (counselor, type) => {
  // timeDelta(시간 증감) 추가 추출
  const { curRev, curTime, timeDelta, unanswered, curMissed } = counselor;
  
  let intro = `안녕하세요 선생님, 담당자입니다.\n요즘 상담 활동 하시느라 정말 고생 많으셨습니다.`;
  let body = "";
  let closing = "\n\n언제든 궁금한 점 있으시면 편하게 말씀주세요. 항상 응원하겠습니다.";

  // 상황별 로직 분기
  if (type === 'D') { // 후기 미작성
    const advice = KNOWLEDGE_BASE.review[Math.floor(Math.random() * KNOWLEDGE_BASE.review.length)];
    intro += `\n다름이 아니라, 현재 미답변 후기가 ${unanswered}건 확인되어 연락드렸습니다.`;
    body = `\n\n💡 **담당자의 Tip**\n"${advice}"\n\n바쁘시겠지만, 기다리시는 고객님들을 위해 잠시 시간 내어 답변 부탁드립니다.`;
  } 
  else if (type === 'B') { // 매출 하락
    const advice = KNOWLEDGE_BASE.revenue_low[Math.floor(Math.random() * KNOWLEDGE_BASE.revenue_low.length)];
    intro += `\n최근 접속 시간 대비 성과가 조금 아쉬운 것 같아, 도움을 드리고 싶어 연락드렸습니다.`;
    body = `\n\n💡 **상담 노하우 공유**\n"${advice}"\n\n이 부분을 조금만 더 신경 써주시면 금방 예전 같은 좋은 흐름을 타실 거라 확신합니다.`;
  }
  else if (type === 'A') { // 접속 시간 부족 (증감 기준 피드백)
    const advice = KNOWLEDGE_BASE.time_low[Math.floor(Math.random() * KNOWLEDGE_BASE.time_low.length)];
    
    // timeDelta가 음수일 때(감소했을 때) 절댓값으로 변환하여 시간 계산
    // 데이터가 없거나 양수일 경우 기본 멘트 처리
    if (timeDelta < 0) {
        const decreasedHours = Math.abs(Math.floor(timeDelta / 3600));
        intro += `\n지난주 대비 접속 시간이 약 ${decreasedHours}시간 정도 줄어들어, 혹시 바쁜 일이 있으신가 하여 연락드렸습니다.`;
    } else {
        intro += `\n최근 접속 시간이 다소 불규칙한 것 같아, 혹시 노출이 줄어들까 걱정되어 연락드렸습니다.`;
    }

    body = `\n\n💡 **안정적인 인입을 위해**\n"${advice}"\n\n선생님 편하신 시간대를 정해 조금만 더 접속 부탁드리겠습니다.`;
  }
  else if (type === 'C') { // 부재중
    intro += `\n최근 부재중 건수가 ${curMissed}건 발생하여, 혹시 놓친 고객님들이 계실까 하여 연락드렸습니다.`;
    // [수정] 시스템 노출 순위 언급 삭제 -> 고객 이탈 관점
    body = `\n\n상담을 원하셨던 고객님들이 연결되지 않아 아쉽게 발길을 돌릴 수 있습니다.\n잠시 자리를 비우실 때는 꼭 '상담 OFF' 설정을 부탁드립니다.`;
  }
  else { // 일반적인 격려
    const advice = KNOWLEDGE_BASE.retention[0];
    body = `\n\n요즘 날씨도 추운데 건강 잘 챙기시고, 상담하시면서 어려운 점은 없으신가요?\n\n💡 **이달의 상담 Tip**\n"${advice}"`;
  }

  return refineText(intro + body + closing);
};

// 4. 챗봇용 상담사 심층 분석 함수 (AiChatbot용)
export const analyzeCounselor = (counselor) => {
    if (!counselor) return "죄송해요, 해당 상담사 정보를 찾을 수 없습니다.";
    
    const { nick, curRev, curTime, unanswered, curMissed } = counselor;
    const hours = Math.floor(curTime / 3600);
    let analysis = `📊 **[${nick}] 선생님 데이터 분석**\n\n`;
    
    if (hours > 30 && curRev < 500000) {
        analysis += `⚠️ **[효율 저하]**\n접속 시간(${hours}시간)은 충분하나 매출 전환이 낮습니다.\n`;
        analysis += `👉 **진단**: 내담자의 말을 듣기만 하거나, 리드가 부족할 수 있습니다.\n`;
        analysis += `💡 **코칭 포인트**: ${KNOWLEDGE_BASE.revenue_low[0]}`;
    } else if (unanswered > 5) {
        analysis += `⚠️ **[관리 소홀]**\n미답변 후기가 ${unanswered}건입니다. 재방문율 하락이 우려됩니다.\n`;
        analysis += `👉 **진단**: 상담 후 고객 관리가 되지 않고 있습니다.\n`;
        analysis += `💡 **코칭 포인트**: ${KNOWLEDGE_BASE.review[2]}`;
    } else if (hours < 10) {
        analysis += `⚠️ **[활동 부족]**\n접속 시간이 ${hours}시간으로 매우 적어 신규 유입이 어렵습니다.\n`;
        analysis += `👉 **진단**: 고정된 접속 시간이 확보되지 않았습니다.\n`;
        analysis += `💡 **코칭 포인트**: ${KNOWLEDGE_BASE.time_low[0]}`;
    } else if (curMissed > 5) {
        analysis += `⚠️ **[부재중 과다]**\n부재중이 ${curMissed}건입니다.\n`;
        analysis += `👉 **진단**: 대기 상태 관리가 필요합니다.\n`;
        analysis += `💡 **코칭 포인트**: 부재중 발생 시 5분 내 콜백은 불가하므로, 상담 OFF 습관화 필요.`;
    } else {
        analysis += `✅ **[양호]**\n전반적으로 안정적인 활동을 하고 계십니다.\n`;
        analysis += `💡 **성장 제안**: ${KNOWLEDGE_BASE.retention[1]}`;
    }

    return refineText(analysis);
};