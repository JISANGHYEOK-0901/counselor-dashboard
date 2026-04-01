import React, { useState, useMemo } from "react";
import {
  Maximize2,
  X,
  Sparkles,
  Search,
  RotateCcw,
  MessageCircle,
  Settings,
  Save,
  Trash2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { getFilterCondition } from "../utils/aiSearch";
import MessageModal from "./MessageModal";

const ISSUE_LABELS = {
  A: "A 접속시간",
  B: "B 정산금액",
  C: "C 부재중",
  D: "D 후기",
  "C(월간부재)": "C 월간부재",
  시간미달: "시간미달",
};

const fmt = (n) => (n || 0).toLocaleString();
const fmtTime = (s) => {
  if (!s) return "0시간 0분";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}시간 ${m}분`;
};
const fmtRate = (n) => (n || 0).toFixed(1) + "%";

// 통계 계산 헬퍼 함수
const calculateStats = (data) => {
  if (!data || data.length === 0) return {};
  const count = data.length;

  // 매출 통계
  const totalRev = data.reduce((acc, r) => acc + (r.curRev || 0), 0);
  const maxRev = Math.max(...data.map((r) => r.curRev || 0));

  // 시간 통계 (초 단위)
  const totalTime = data.reduce((acc, r) => acc + (r.curTime || 0), 0);
  const maxTime = Math.max(...data.map((r) => r.curTime || 0));

  return {
    count,
    avgRev: totalRev / count,
    maxRev,
    avgTime: totalTime / count,
    maxTime,
  };
};

const ChartComponent = ({
  dataset,
  chartType,
  isMonthly,
  height = 300,
  isDark,
}) => {
  const axisColor = isDark ? "#9ca3af" : "#4b5563";
  const gridColor = isDark ? "#374151" : "#e5e7eb";

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={dataset}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
          stroke={gridColor}
        />
        <XAxis
          dataKey="nick"
          tick={{ fontSize: 14, fill: axisColor }}
          interval={0}
          axisLine={{ stroke: axisColor }}
          tickLine={{ stroke: axisColor }}
        />
        <YAxis
          tickFormatter={(val) =>
            chartType === "revenue"
              ? `${val / 10000}만`
              : `${Math.floor(val / 3600)}시간`
          }
          tick={{ fontSize: 12, fill: axisColor }}
          axisLine={{ stroke: axisColor }}
          tickLine={{ stroke: axisColor }}
        />
        <Tooltip
          formatter={(val, name) => [
            chartType === "revenue" ? fmt(val) + "원" : fmtTime(val),
            name,
          ]}
          contentStyle={{
            backgroundColor: isDark ? "#1f2937" : "#fff",
            borderColor: isDark ? "#374151" : "#ccc",
            color: isDark ? "#f3f4f6" : "#000",
          }}
          itemStyle={{ color: isDark ? "#f3f4f6" : "#000" }}
          labelStyle={{
            color: isDark ? "#9ca3af" : "#000",
            marginBottom: "0.5rem",
          }}
          cursor={{
            fill: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
          }}
        />
        <Legend wrapperStyle={{ fontSize: "14px", color: axisColor }} />
        <Bar
          dataKey={chartType === "revenue" ? "prevRev" : "prevTime"}
          fill={isDark ? "#4b5563" : "#e5e7eb"}
          name={isMonthly ? "지난달" : "지난주"}
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey={chartType === "revenue" ? "curRev" : "curTime"}
          fill={chartType === "revenue" ? "#6366f1" : "#10b981"}
          name={isMonthly ? "이번달" : "이번주"}
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

const DashboardView = ({ data, memo, setMemo, isMonthly, isDark }) => {
  const [chartType, setChartType] = useState("revenue");
  const [showModal, setShowModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isMsgModalOpen, setIsMsgModalOpen] = useState(false);
  const [selectedMsgCounselor, setSelectedMsgCounselor] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [filterCode, setFilterCode] = useState(null);
  const [aiSortConfig, setAiSortConfig] = useState(null);
  const [thresholds, setThresholds] = useState({
    missed: 10,
    unanswered: 5,
    minTime: 30,
    revDrop: 10,
  });

  const handleOpenMsg = (row) => {
    setSelectedMsgCounselor(row);
    setIsMsgModalOpen(true);
  };
  const handleSettingChange = (key, val) => {
    setThresholds((prev) => ({ ...prev, [key]: Number(val) }));
  };

  // 메모 일괄 삭제 핸들러
  const handleClearMemos = () => {
    if (Object.keys(memo).length === 0) {
      alert("삭제할 메모가 없습니다.");
      return;
    }
    if (
      window.confirm(
        "현재 작성된 모든 메모를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.",
      )
    ) {
      setMemo({});
    }
  };

  const renderDelta = (val, type) => {
    if (!val || val === 0) return null;
    const isPos = val > 0;
    const color = isPos
      ? "text-blue-600 dark:text-blue-400"
      : "text-red-600 dark:text-red-400";
    const sign = isPos ? "+" : "-";
    const absVal = Math.abs(val);
    let text =
      type === "time"
        ? `${sign}${fmtTime(absVal)}`
        : `${sign}${absVal.toLocaleString()}원`;
    return <div className={`text-xs ${color}`}>{text}</div>;
  };

  const resetSearch = () => {
    setSearchQuery("");
    setFilterCode(null);
    setAiSortConfig(null);
  };

  const handleAiSearch = async (userInput = searchQuery) => {
    if (!userInput || !userInput.trim()) {
      resetSearch();
      return;
    }

    setIsSearching(true);
    try {
      const stats = calculateStats(data);
      const result = await getFilterCondition(userInput, stats);

      setFilterCode(result.filterCode);
      if (result.sortField && result.sortField !== "null") {
        const cleanKey = result.sortField.replace("item.", "");
        setAiSortConfig({ key: cleanKey, order: result.sortOrder || "desc" });
      } else {
        setAiSortConfig(null);
      }
    } catch (error) {
      console.error("AI Search Error:", error);
      alert("검색 오류가 발생했습니다.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleAiSearch(e.target.value);
    }
  };

  const recalculatedData = useMemo(() => {
    return data.map((row) => {
      if (row.status === "blind") return { ...row, issues: [] };
      const newIssues = [];
      const { missed, unanswered, minTime, revDrop } = thresholds;
      if (row.curMissed >= missed) newIssues.push("C");
      if (row.unanswered >= unanswered) newIssues.push("D");
      const curTimeHour = row.curTime / 3600;
      if (row.status !== "new" && curTimeHour < minTime) newIssues.push("A");
      const prevRev = row.prevRev || 0;
      const curRev = row.curRev || 0;
      if (
        row.status !== "new" &&
        prevRev > 0 &&
        (prevRev - curRev) / prevRev >= revDrop / 100
      )
        newIssues.push("B");
      return { ...row, issues: newIssues };
    });
  }, [data, thresholds]);

  const filteredData = useMemo(() => {
    let result = [...recalculatedData];
    if (filterCode && filterCode !== "true") {
      try {
        const filterFn = new Function("item", `return ${filterCode}`);
        result = result.filter((item) => filterFn(item));
      } catch (e) {
        console.error(e);
      }
    }
    result.sort((a, b) => {
      let valA,
        valB,
        order = "desc";
      if (aiSortConfig) {
        valA = a[aiSortConfig.key] || 0;
        valB = b[aiSortConfig.key] || 0;
        order = aiSortConfig.order;
      } else {
        valA = chartType === "revenue" ? a.curRev : a.curTime;
        valB = chartType === "revenue" ? b.curRev : b.curTime;
      }
      return order === "asc" ? valA - valB : valB - valA;
    });
    return result;
  }, [recalculatedData, filterCode, aiSortConfig, chartType]);

  // 등급별 인원 수 계산 로직
  const levelCounts = useMemo(() => {
    const counts = {
      퍼플: { 6: 0, 5: 0, 4: 0, 3: 0, 2: 0, 1: 0, 0: 0 },
      그린: { 6: 0, 5: 0, 4: 0, 3: 0, 2: 0, 1: 0, 0: 0 },
    };

    filteredData.forEach((row) => {
      let cat = null;
      if (row.levelCat && row.levelCat.includes("퍼플")) cat = "퍼플";
      else if (row.levelCat && row.levelCat.includes("그린")) cat = "그린";

      const lv =
        row.levelNum !== undefined
          ? row.levelNum
          : parseInt(String(row.level).replace(/[^0-9]/g, "")) || 0;

      if (cat && counts[cat][lv] !== undefined) {
        counts[cat][lv]++;
      }
    });

    return counts;
  }, [filteredData]);

  const top10Data = useMemo(() => filteredData.slice(0, 10), [filteredData]);

  return (
    <div>
      <div className="mb-6 bg-indigo-50 dark:bg-gray-800 p-4 rounded-xl border border-indigo-100 dark:border-gray-700 flex items-center gap-3 shadow-sm transition-colors">
        <div className="bg-white dark:bg-gray-700 p-2 rounded-full text-indigo-600 dark:text-indigo-400 shadow-sm border border-transparent dark:border-gray-600">
          <Sparkles size={20} />
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-center mb-1">
            <h4 className="text-xs font-bold text-indigo-800 dark:text-indigo-300">
              AI 자연어 검색 (예: "평균 매출 이상", "퍼플만", "2단계")
            </h4>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                className="w-full border border-indigo-200 dark:border-gray-600 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-colors"
                placeholder="검색어를 입력하세요..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isSearching}
              />
              <Search
                className="absolute left-3 top-2.5 text-indigo-300 dark:text-gray-400"
                size={16}
              />
            </div>
            <button
              onClick={() => handleAiSearch()}
              disabled={isSearching}
              className="bg-indigo-600 dark:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-indigo-700 dark:hover:bg-indigo-600 transition disabled:bg-indigo-300 dark:disabled:bg-gray-700 shadow-sm"
            >
              {isSearching ? "..." : "검색"}
            </button>
            {(filterCode || aiSortConfig) && (
              <button
                onClick={resetSearch}
                className="bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-300 border dark:border-gray-600 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition shadow-sm"
                title="초기화"
              >
                <RotateCcw size={18} />
              </button>
            )}
            <button
              onClick={() => setShowSettings(true)}
              className="bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition flex items-center gap-1 font-bold shadow-sm"
              title="설정"
            >
              <Settings size={18} />
            </button>
            <button
              onClick={handleClearMemos}
              className="bg-white dark:bg-gray-700 text-red-500 dark:text-red-400 border border-red-200 dark:border-red-900 px-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition flex items-center gap-1 font-bold shadow-sm"
              title="메모 일괄 삭제"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* 등급별 인원 현황 패널 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 animate-fade-in-up">
        {/* 퍼플 등급 현황 */}
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-xl p-4 shadow-sm flex flex-col gap-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded text-xs font-bold">
              퍼플 등급
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              총 {Object.values(levelCounts["퍼플"]).reduce((a, b) => a + b, 0)}
              명
            </span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-700 dark:text-gray-300">
            {[6, 5, 4, 3, 2, 1, 0].map((lv) => (
              <div
                key={lv}
                className={`flex items-center gap-1 ${
                  levelCounts["퍼플"][lv] === 0 ? "opacity-40" : "font-bold"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                <span>{lv}단계:</span>
                <span className="text-purple-700 dark:text-purple-300">
                  {levelCounts["퍼플"][lv]}명
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 그린 등급 현황 */}
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-xl p-4 shadow-sm flex flex-col gap-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300 px-2 py-0.5 rounded text-xs font-bold">
              그린 등급
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              총 {Object.values(levelCounts["그린"]).reduce((a, b) => a + b, 0)}
              명
            </span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-700 dark:text-gray-300">
            {[6, 5, 4, 3, 2, 1, 0].map((lv) => (
              <div
                key={lv}
                className={`flex items-center gap-1 ${
                  levelCounts["그린"][lv] === 0 ? "opacity-40" : "font-bold"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                <span>{lv}단계:</span>
                <span className="text-green-700 dark:text-green-300">
                  {levelCounts["그린"][lv]}명
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-96 shadow-2xl animate-fade-in-up border dark:border-gray-700 transition-colors">
            <div className="flex justify-between items-center mb-4 border-b dark:border-gray-700 pb-2">
              <h3 className="font-bold text-lg flex items-center gap-2 text-gray-900 dark:text-gray-100">
                <Settings size={20} /> 이슈 기준 설정
              </h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4">
              {["missed", "unanswered", "minTime", "revDrop"].map(
                (field, i) => (
                  <div key={field}>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                      {
                        [
                          "📞 C: 부재중",
                          "✍️ D: 미답변 후기",
                          "⏰ A: 최소 접속시간",
                          "📉 B: 매출 하락",
                        ][i]
                      }
                    </label>
                    <input
                      type="number"
                      className="w-full border dark:border-gray-600 p-2 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-500 outline-none"
                      value={thresholds[field]}
                      onChange={(e) =>
                        handleSettingChange(field, e.target.value)
                      }
                    />
                  </div>
                ),
              )}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowSettings(false)}
                className="bg-indigo-600 dark:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700 dark:hover:bg-indigo-600 flex items-center gap-2 shadow-sm"
              >
                <Save size={16} /> 저장
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8 p-4 border dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 shadow-sm transition-colors">
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-2 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
            <button
              onClick={() => setChartType("revenue")}
              className={`px-4 py-2 text-sm font-bold rounded-md transition ${
                chartType === "revenue"
                  ? "bg-white dark:bg-gray-600 shadow text-indigo-600 dark:text-indigo-300"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              💰 정산금액
            </button>
            <button
              onClick={() => setChartType("time")}
              className={`px-4 py-2 text-sm font-bold rounded-md transition ${
                chartType === "time"
                  ? "bg-white dark:bg-gray-600 shadow text-green-600 dark:text-green-400"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              ⏰ 접속시간
            </button>
          </div>
          <div className="flex items-center gap-2">
            {aiSortConfig && (
              <span className="text-xs font-bold bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200 px-2 py-1 rounded">
                🤖 {aiSortConfig.key} 정렬 중
              </span>
            )}
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
              총 {filteredData.length}명
            </span>
            <button
              onClick={() => setShowModal(true)}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 font-bold border dark:border-gray-600 px-3 py-1.5 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              <Maximize2 size={16} /> 전체보기
            </button>
          </div>
        </div>
        <div className="h-72 w-full">
          <ChartComponent
            dataset={top10Data}
            chartType={chartType}
            isMonthly={isMonthly}
            isDark={isDark}
          />
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 md:p-10">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full h-full max-w-7xl p-6 flex flex-col shadow-2xl border dark:border-gray-700 transition-colors">
            <div className="flex justify-between items-center mb-4 border-b dark:border-gray-700 pb-2">
              <h3 className="font-bold text-xl flex items-center gap-2 text-gray-900 dark:text-gray-100">
                {chartType === "revenue" ? (
                  <span className="text-indigo-600 dark:text-indigo-400">
                    💰 정산금액
                  </span>
                ) : (
                  <span className="text-green-600 dark:text-green-400">
                    ⏰ 접속시간
                  </span>
                )}{" "}
                전체 비교
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition text-gray-500 dark:text-gray-400"
              >
                <X size={28} />
              </button>
            </div>
            <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4 scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-200 dark:scrollbar-track-gray-800">
              <div
                style={{
                  width: `${Math.max(100, filteredData.length * 60)}px`,
                  height: "100%",
                }}
              >
                <ChartComponent
                  dataset={filteredData}
                  chartType={chartType}
                  isMonthly={isMonthly}
                  height="100%"
                  isDark={isDark}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border dark:border-gray-700 shadow-sm">
        <table className="w-full text-sm text-center whitespace-nowrap border-collapse table-fixed">
          <thead className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold uppercase sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="p-3 w-28 sticky left-0 bg-gray-100 dark:bg-gray-800 border-r dark:border-gray-700 z-20">
                닉네임
              </th>
              <th className="p-3 w-24">카테고리</th>
              <th className="p-3 w-24">단계</th>
              <th className="p-3 w-20">레벨</th>
              <th className="p-3 bg-blue-50 dark:bg-blue-900/20 w-32">
                접속시간
              </th>
              <th className="p-3 bg-blue-50 dark:bg-blue-900/20 w-24">
                증감률
              </th>
              <th className="p-3 bg-blue-50 dark:bg-blue-900/20 w-32">
                정산금액
              </th>
              <th className="p-3 bg-blue-50 dark:bg-blue-900/20 w-24">
                증감률
              </th>
              <th className="p-3 w-24">미작성후기</th>
              <th className="p-3 w-20">부재중</th>
              <th className="p-3 text-left w-80">이슈/비고</th>
              <th className="p-3 w-24">관리</th>
              <th className="p-3 min-w-[350px]">메모</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800 dark:text-gray-300">
            {filteredData.map((row, idx) => {
              const timeColor =
                row.timeRate < 0
                  ? "text-red-600 dark:text-red-400"
                  : "text-blue-600 dark:text-blue-400";
              const revColor =
                row.revRate < 0
                  ? "text-red-600 dark:text-red-400"
                  : "text-blue-600 dark:text-blue-400";
              let rowClass =
                "hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors";
              let stickyClass = "bg-white dark:bg-gray-800";
              if (row.status === "blind") {
                rowClass =
                  "bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30";
                stickyClass = "bg-red-50 dark:bg-red-900/20";
              } else if (row.status === "new") {
                rowClass =
                  "bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30";
                stickyClass = "bg-yellow-50 dark:bg-yellow-900/20";
              }

              return (
                <tr key={idx} className={rowClass}>
                  <td
                    className={`p-3 font-bold sticky left-0 border-r dark:border-gray-700 z-10 text-gray-800 dark:text-gray-100 ${stickyClass}`}
                  >
                    {row.nick}
                  </td>
                  <td className="p-3">{row.category}</td>
                  <td className="p-3">{row.levelCat}</td>
                  <td className="p-3">{row.level}</td>
                  <td className="p-3">
                    <div className="font-medium">{fmtTime(row.curTime)}</div>
                    {renderDelta(row.timeDelta, "time")}
                  </td>
                  <td className={`p-3 ${timeColor}`}>
                    {fmtRate(row.timeRate * 100)}
                  </td>
                  <td className="p-3">
                    <div className="font-medium">{fmt(row.curRev)}</div>
                    {renderDelta(row.revDelta, "money")}
                  </td>
                  <td className={`p-3 ${revColor}`}>
                    {fmtRate(row.revRate * 100)}
                  </td>
                  <td
                    className={`p-3 font-bold ${
                      row.unanswered > 0
                        ? "text-red-600 dark:text-red-400"
                        : "text-gray-400 dark:text-gray-600"
                    }`}
                  >
                    {row.unanswered}
                  </td>
                  <td className="p-3">{row.curMissed}</td>
                  <td className="p-3 text-left">
                    <div className="flex flex-col gap-1 items-start">
                      {row.remarks !== "-" && (
                        <span className="text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 border dark:border-gray-600 px-2 py-0.5 rounded text-xs font-medium">
                          {row.remarks}
                        </span>
                      )}
                      {row.issues.map((code) => (
                        <span
                          key={code}
                          className="px-2 py-0.5 rounded text-xs font-bold border flex items-center gap-1 bg-yellow-50 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800"
                        >
                          {ISSUE_LABELS[code] || code}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => handleOpenMsg(row)}
                      className={`px-3 py-1.5 rounded text-xs font-bold transition-all border flex items-center justify-center gap-1 w-full ${
                        (row.issues && row.issues.length > 0) ||
                        row.status === "blind" ||
                        row.status === "new"
                          ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 hover:bg-purple-200 dark:hover:bg-purple-900/50"
                          : "bg-white dark:bg-gray-700 text-gray-400 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
                      }`}
                    >
                      <MessageCircle size={14} />
                      {row.issues?.length > 0 ? "생성" : "메시지"}
                    </button>
                  </td>
                  <td className="p-3">
                    <input
                      className="border dark:border-gray-600 rounded px-2 py-1.5 w-full bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-shadow text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                      placeholder="메모..."
                      value={memo[row.nick] || ""}
                      onChange={(e) =>
                        setMemo({ ...memo, [row.nick]: e.target.value })
                      }
                    />
                  </td>
                </tr>
              );
            })}
            {filteredData.length === 0 && (
              <tr>
                <td
                  colSpan="13"
                  className="p-10 text-gray-400 dark:text-gray-500"
                >
                  검색 조건에 맞는 상담사가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <MessageModal
        isOpen={isMsgModalOpen}
        onClose={() => setIsMsgModalOpen(false)}
        counselor={selectedMsgCounselor}
      />
    </div>
  );
};

export default DashboardView;
