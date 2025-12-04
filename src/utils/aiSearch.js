import { GoogleGenAI } from "@google/genai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  console.error("❌ API 키가 없습니다. .env 파일을 확인해주세요.");
}

const genAI = new GoogleGenAI({ apiKey });

export const getFilterCondition = async (userInput) => {
  try {
    // ---------------------------------------------------------
    // 1. 단순 단어 검색 최적화 (AI 비용 절약 + 속도 향상)
    // ---------------------------------------------------------
    // 입력이 짧고 띄어쓰기가 없다면 -> 닉네임, 카테고리, 등급에서 모두 찾아봅니다.
    if (userInput.length >= 1 && !userInput.includes(' ')) {
        const keyword = userInput;
        // 닉네임에 있거나, OR 카테고리(타로,신점)에 있거나, OR 등급(퍼플,그린)에 있거나
        const simpleCode = `(
            (item.nick && item.nick.includes('${keyword}')) || 
            (item.category && item.category.includes('${keyword}')) || 
            (item.levelCat && item.levelCat.includes('${keyword}'))
        )`;
        console.log(`[통합 검색] "${keyword}" -> 닉네임/분야/등급 통합 검색`);
        return simpleCode;
    }

    // ---------------------------------------------------------
    // 2. 복잡한 문장 -> AI에게 해석 요청
    // ---------------------------------------------------------
    const systemPrompt = `
      너는 상담사 데이터 필터링을 위한 '자바스크립트 조건문 변환기'야.
      
      [데이터 필드 명세]
      - item.nick : 닉네임 (예: '타로마스터', '천사')
      - item.category : 상담 분야 (예: '타로', '신점', '사주')
      - item.levelCat : 등급 분류 (예: '그린', '퍼플')
      - item.level : 상세 등급 (예: '1단계', '6단계')
      - item.unanswered : 미작성 후기 수 (숫자)
      - item.curMissed : 부재중 횟수 (숫자)
      - item.curRev : 매출/정산금 (숫자, 원 단위)
      - item.curTime : 접속시간 (숫자, 분 단위. *주의: 1시간=60*)

      [규칙]
      1. 말대꾸 금지. 오직 **JavaScript 조건식**만 반환해.
      2. 문자열 검색은 무조건 .includes()를 사용해. (예: category === '타로' (X) -> category.includes('타로') (O))
      3. AND는 &&, OR는 || 사용.
      
      [예시]
      Q: "타로 상담사 보여줘"
      A: item.category.includes('타로')

      Q: "퍼플 등급인 사람"
      A: item.levelCat.includes('퍼플')

      Q: "매출 50만 이상이고 신점 상담사"
      A: item.curRev >= 500000 && item.category.includes('신점')

      Q: "부재중 5회 이상인 그린 등급"
      A: item.curMissed >= 5 && item.levelCat.includes('그린')
    `;

    const response = await genAI.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        { role: "user", parts: [{ text: systemPrompt + `\n\n사용자 입력: ${userInput}` }] }
      ]
    });

    let responseText = "";
    if (typeof response.text === "function") {
        responseText = response.text();
    } else {
        responseText = response.text || "";
    }

    // 마크다운 및 불필요한 공백 제거
    let cleanCode = responseText.replace(/```javascript|```/g, '').trim();

    // 안전장치: AI가 엉뚱한 말을 했을 경우
    if (cleanCode.includes("죄송합니다") || cleanCode.length < 5) {
        return `item.nick.includes('${userInput}')`;
    }

    console.log(`[AI 검색] 입력: "${userInput}" -> 변환: "${cleanCode}"`);
    return cleanCode;

  } catch (error) {
    console.error("AI Search Error:", error);
    // 에러 발생 시 기본적으로 닉네임 검색 시도
    return `item.nick.includes('${userInput}')`;
  }
};