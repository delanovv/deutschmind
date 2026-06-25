import { useEffect, useRef, useState } from "react";
import KnowledgeLegend from "./KnowledgeLegend.jsx";

const colors = {
  known: "#45dc78",
  boundary: "#ffc62e",
  unknown: "#ff4d55",
};

function TopicIcon({ topic }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };
  const name = topic.toLocaleLowerCase("de-DE");
  if (name === "deutsch")
    return (
      <g {...common}>
        <path d="M-14-10c7-2 11 0 14 4v18c-3-4-7-6-14-4zM14-10C7-12 3-10 0-6v18c3-4 7-6 14-4z" />
        <path d="M0-6v18" />
      </g>
    );
  if (name === "alltag")
    return (
      <g {...common}>
        <rect x="-13" y="-11" width="26" height="24" rx="3" />
        <path d="M-7-15v7M7-15v7M-13-4h26M-7 2h4M3 2h4M-7 8h4M3 8h4" />
      </g>
    );
  if (name === "arbeit")
    return (
      <g {...common}>
        <rect x="-15" y="-8" width="30" height="21" rx="3" />
        <path d="M-7-8v-5h14v5M-15 0c9 5 21 5 30 0M-2 1h4v4h-4z" />
      </g>
    );
  if (name === "wohnung")
    return (
      <g {...common}>
        <path d="M-16 0 0-14 16 0M-12-2v16h24V-2M-4 14V4h8v10" />
      </g>
    );
  if (name.includes("beh"))
    return (
      <g {...common}>
        <path d="M-16-7 0-15 16-7M-14-7h28M-12 11h24M-16 15h32M-10-7v18M-3-7v18M4-7v18M11-7v18" />
      </g>
    );
  if (name === "gesundheit")
    return (
      <g {...common}>
        <path d="M0 14S-17 4-17-6c0-10 13-12 17-3 4-9 17-7 17 3C17 4 0 14 0 14z" />
        <path d="M-12 1h7l3-6 5 11 3-5h7" />
      </g>
    );
  if (name === "familie")
    return (
      <g {...common}>
        <circle cx="-7" cy="-7" r="5" />
        <circle cx="8" cy="-6" r="5" />
        <circle cy="-11" r="5" />
        <path d="M-17 12c1-8 6-12 11-12M17 12C16 4 12 0 7 0M-10 14C-9 4-5 0 0 0s9 4 10 14" />
      </g>
    );
  if (name === "einkaufen")
    return (
      <g {...common}>
        <path d="M-17-12h4l4 19h19l4-14H-11M-6 7h17" />
        <circle cx="-5" cy="13" r="2" />
        <circle cx="9" cy="13" r="2" />
      </g>
    );
  return (
    <g {...common}>
      <circle r="5" />
      <circle cx="-13" cy="7" r="3" />
      <circle cx="13" cy="7" r="3" />
      <path d="M-11 5-4 1M11 5 4 1M0-5v-8" />
    </g>
  );
}

function splitLabel(label, limit = 18) {
  if (label.length <= limit) return [label];
  const words = label.split(" ");
  if (words.length === 1) return [`${label.slice(0, limit - 1)}…`];
  const lines = [""];
  words.forEach((word) => {
    const current = lines.at(-1);
    if (`${current} ${word}`.trim().length <= limit)
      lines[lines.length - 1] = `${current} ${word}`.trim();
    else if (lines.length < 2) lines.push(word);
  });
  return lines;
}

function positionLabel(node, center) {
  const dx = node.position.x - center.x;
  const dy = node.position.y - center.y;
  if (Math.abs(dx) < 22)
    return { x: 0, y: dy < 0 ? -28 : 35, anchor: "middle" };
  return { x: dx < 0 ? -25 : 25, y: 5, anchor: dx < 0 ? "end" : "start" };
}

function createAllLayout(graph, preview) {
  const root =
    graph.nodes.find(
      (node) => node.type === "topic" && node.label === "Deutsch",
    ) || graph.nodes.find((node) => node.type === "topic");
  const topics = graph.nodes.filter(
    (node) => node.type === "topic" && node.id !== root?.id,
  );
  const overviewNames = [
    "Alltag",
    "Arbeit",
    "Wohnung",
    "Behörde",
    "Gesundheit",
    "Familie",
    "Einkaufen",
  ];
  const preferred = overviewNames
    .map((name) => topics.find((topic) => topic.label === name))
    .filter(Boolean);
  const orderedTopics = [
    ...preferred,
    ...topics.filter((topic) => !preferred.includes(topic)),
  ];
  const visibleTopics = orderedTopics.slice(
    0,
    preview ? 4 : orderedTopics.length,
  );
  const width = preview ? 760 : 2600;
  const height = preview ? 690 : 2600;
  const rootPosition = { x: width / 2, y: height / 2 };
  const positioned = root
    ? [{ ...root, position: rootPosition, graphRole: "root" }]
    : [];
  const edges = [];
  const previewCenters = preview
    ? [
        { x: 380, y: 120 },
        { x: 165, y: 355 },
        { x: 595, y: 355 },
        { x: 380, y: 575 },
      ]
    : [];

  visibleTopics.forEach((topic, topicIndex) => {
    const innerCount = Math.min(8, visibleTopics.length);
    const outerCount = Math.max(1, visibleTopics.length - innerCount);
    const outer = topicIndex >= innerCount;
    const ringIndex = outer ? topicIndex - innerCount : topicIndex;
    const ringCount = outer ? outerCount : innerCount;
    const angle =
      -Math.PI / 2 +
      (Math.PI * 2 * ringIndex) / ringCount +
      (outer ? Math.PI / outerCount : 0);
    const radius = outer ? 1030 : 610;
    const center = preview
      ? previewCenters[topicIndex]
      : {
          x: Math.round(rootPosition.x + Math.cos(angle) * radius),
          y: Math.round(rootPosition.y + Math.sin(angle) * radius),
        };
    positioned.push({ ...topic, position: center, graphRole: "topic" });
    if (root)
      edges.push({
        id: `root-${topic.id}`,
        source: root.id,
        target: topic.id,
        type: "web_link",
      });

    const members = graph.nodes
      .filter((node) => node.type !== "topic" && node.topic === topic.label)
      .slice(0, preview ? 4 : 7);
    members.forEach((node, index) => {
      const angle =
        -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(members.length, 1);
      const radiusX = preview ? 105 : outer ? 128 : 145;
      const radiusY = preview ? 88 : outer ? 112 : 128;
      positioned.push({
        ...node,
        position: {
          x: Math.round(center.x + Math.cos(angle) * radiusX),
          y: Math.round(center.y + Math.sin(angle) * radiusY),
        },
        graphRole: "word",
        webCenter: center,
      });
      edges.push({
        id: `${topic.id}-${node.id}`,
        source: topic.id,
        target: node.id,
        type: "spoke",
      });
    });
  });

  return { nodes: positioned, edges, width, height, center: rootPosition };
}

function createFocusedLayout(graph, activeWeb) {
  const topic = graph.nodes.find(
    (node) => node.type === "topic" && node.label === activeWeb,
  );
  const members = graph.nodes.filter(
    (node) => node.type !== "topic" && node.topic === activeWeb,
  );
  const width = 1800;
  const height = 1500;
  const center = { x: width / 2, y: height / 2 };
  const nodes = topic
    ? [{ ...topic, position: center, graphRole: "root" }]
    : [];
  const edges = [];

  members.forEach((node, index) => {
    const ring = index < 10 ? 1 : 2;
    const ringIndex = ring === 1 ? index : index - 10;
    const ringCount =
      ring === 1
        ? Math.min(members.length, 10)
        : Math.max(members.length - 10, 1);
    const angle = -Math.PI / 2 + (Math.PI * 2 * ringIndex) / ringCount;
    const radiusX = ring === 1 ? 360 : 610;
    const radiusY = ring === 1 ? 330 : 540;
    nodes.push({
      ...node,
      position: {
        x: Math.round(center.x + Math.cos(angle) * radiusX),
        y: Math.round(center.y + Math.sin(angle) * radiusY),
      },
      graphRole: "word",
      webCenter: center,
    });
    if (topic)
      edges.push({
        id: `${topic.id}-${node.id}`,
        source: topic.id,
        target: node.id,
        type: "spoke",
      });
  });
  return { nodes, edges, width, height, center };
}

export default function KnowledgeGraph({
  graph,
  selectedId,
  onSelect,
  activeWeb = "",
  onWebChange,
  preview = false,
}) {
  const topics = graph.nodes.filter((node) => node.type === "topic");
  const layout = activeWeb
    ? createFocusedLayout(graph, activeWeb)
    : createAllLayout(graph, preview);
  const nodeMap = new Map(layout.nodes.map((node) => [node.id, node]));
  const learningNodes = graph.nodes.filter((node) => node.type !== "topic");
  const mastery = learningNodes.length
    ? Math.round(
        learningNodes.reduce((sum, node) => sum + node.knowledgeScore, 0) /
          learningNodes.length,
      )
    : 0;
  const initialView = () =>
    preview
      ? { x: 0, y: 0, width: layout.width, height: layout.height }
      : {
          x: layout.center.x - (activeWeb ? 480 : 500),
          y: layout.center.y - (activeWeb ? 520 : 570),
          width: activeWeb ? 960 : 1000,
          height: activeWeb ? 1040 : 1140,
        };
  const [view, setView] = useState(initialView);
  const svgRef = useRef(null);
  const viewRef = useRef(view);
  const pointersRef = useRef(new Map());
  const gestureRef = useRef(null);
  const draggedRef = useRef(false);
  const pointerTimeRef = useRef(0);

  useEffect(() => {
    const next = initialView();
    viewRef.current = next;
    setView(next);
  }, [activeWeb, graph.nodes.length, preview]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || preview) return;

    const handleWheel = (event) => {
      event.preventDefault();
      zoomAt(event.deltaY < 0 ? 0.86 : 1.16, event.clientX, event.clientY);
    };

    svg.addEventListener("wheel", handleWheel, { passive: false });
    return () => svg.removeEventListener("wheel", handleWheel);
  }, [preview]);

  const commitView = (next) => {
    const minWidth = preview ? layout.width : 360;
    const maxWidth = layout.width * 1.35;
    const ratio = viewRef.current.height / viewRef.current.width;
    const width = Math.max(minWidth, Math.min(maxWidth, next.width));
    const height = width * ratio;
    const marginX = width * 0.35;
    const marginY = height * 0.35;
    const bounded = {
      x: Math.max(-marginX, Math.min(layout.width - width + marginX, next.x)),
      y: Math.max(-marginY, Math.min(layout.height - height + marginY, next.y)),
      width,
      height,
    };
    viewRef.current = bounded;
    setView(bounded);
  };

  const zoomAt = (factor, clientX, clientY) => {
    if (preview || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const current = viewRef.current;
    const pointX = clientX ?? rect.left + rect.width / 2;
    const pointY = clientY ?? rect.top + rect.height / 2;
    const px = Math.max(0, Math.min(1, (pointX - rect.left) / rect.width));
    const py = Math.max(0, Math.min(1, (pointY - rect.top) / rect.height));
    const nextWidth = current.width * factor;
    const nextHeight = current.height * factor;
    const worldX = current.x + px * current.width;
    const worldY = current.y + py * current.height;
    commitView({
      x: worldX - px * nextWidth,
      y: worldY - py * nextHeight,
      width: nextWidth,
      height: nextHeight,
    });
  };

  const beginPointer = (event) => {
    if (preview) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    pointerTimeRef.current = Date.now();
    pointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    draggedRef.current = false;
    const points = [...pointersRef.current.values()];
    if (points.length === 1) {
      gestureRef.current = {
        mode: "pan",
        point: points[0],
        view: { ...viewRef.current },
      };
    } else if (points.length === 2) {
      const [a, b] = points;
      gestureRef.current = {
        mode: "pinch",
        distance: Math.hypot(a.x - b.x, a.y - b.y),
        midpoint: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
        view: { ...viewRef.current },
      };
    }
  };

  const movePointer = (event) => {
    if (preview || !pointersRef.current.has(event.pointerId) || !svgRef.current)
      return;
    pointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    const points = [...pointersRef.current.values()];
    const rect = svgRef.current.getBoundingClientRect();
    const gesture = gestureRef.current;

    if (points.length === 1 && gesture?.mode === "pan") {
      const dx = points[0].x - gesture.point.x;
      const dy = points[0].y - gesture.point.y;
      if (Math.hypot(dx, dy) > 10) {
        draggedRef.current = true;
      }
      commitView({
        ...gesture.view,
        x: gesture.view.x - (dx * gesture.view.width) / rect.width,
        y: gesture.view.y - (dy * gesture.view.height) / rect.height,
      });
    } else if (points.length === 2 && gesture?.mode === "pinch") {
      const [a, b] = points;
      const distance = Math.max(20, Math.hypot(a.x - b.x, a.y - b.y));
      const midpoint = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const factor = gesture.distance / distance;
      const width = gesture.view.width * factor;
      const height = gesture.view.height * factor;
      const startPx = (gesture.midpoint.x - rect.left) / rect.width;
      const startPy = (gesture.midpoint.y - rect.top) / rect.height;
      const currentPx = (midpoint.x - rect.left) / rect.width;
      const currentPy = (midpoint.y - rect.top) / rect.height;
      const worldX = gesture.view.x + startPx * gesture.view.width;
      const worldY = gesture.view.y + startPy * gesture.view.height;
      draggedRef.current = true;
      commitView({
        x: worldX - currentPx * width,
        y: worldY - currentPy * height,
        width,
        height,
      });
    }
  };

  const endPointer = (event) => {
    pointersRef.current.delete(event.pointerId);
    const points = [...pointersRef.current.values()];
    if (points.length === 1) {
      gestureRef.current = {
        mode: "pan",
        point: points[0],
        view: { ...viewRef.current },
      };
    } else if (!points.length) {
      gestureRef.current = null;
    }
  };

  const resetView = () => {
    const next = initialView();
    viewRef.current = next;
    setView(next);
  };

  return (
    <>
      {!preview && (
        <div className="web-switcher">
          <button
            className={!activeWeb ? "active" : ""}
            onClick={() => onWebChange?.("")}
          >
            Все
          </button>
          {topics.map((topic) => (
            <button
              className={activeWeb === topic.label ? "active" : ""}
              key={topic.id}
              onClick={() => onWebChange?.(topic.label)}
            >
              {topic.label}
            </button>
          ))}
        </div>
      )}
      <div className={`graph-card web-map ${preview ? "graph-preview" : ""}`}>
        {!preview && <KnowledgeLegend />}
        {!preview && (
          <div className="map-controls" aria-label="Управление картой">
            <button onClick={() => zoomAt(0.78)} aria-label="Приблизить">
              +
            </button>
            <button onClick={() => zoomAt(1.28)} aria-label="Отдалить">
              −
            </button>
            <button onClick={resetView} aria-label="Вернуть карту в центр">
              ◎
            </button>
          </div>
        )}
        <div className="graph-scroll">
          <svg
            ref={svgRef}
            className={preview ? "" : "interactive-map"}
            viewBox={`${view.x} ${view.y} ${view.width} ${view.height}`}
            preserveAspectRatio="xMidYMid slice"
            role="img"
            aria-label="Паутины знаний немецкого языка"
            onPointerDown={beginPointer}
            onPointerMove={movePointer}
            onPointerUp={endPointer}
            onPointerCancel={endPointer}
          >
            <defs>
              <filter
                id="topicGlow"
                x="-80%"
                y="-80%"
                width="260%"
                height="260%"
              >
                <feGaussianBlur stdDeviation="13" result="blur" />
                <feColorMatrix
                  in="blur"
                  values="0.4 0 0 0 0.25  0 0.3 0 0 0.2  0 0 1 0 1  0 0 0 1 0"
                />
                <feMerge>
                  <feMergeNode />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter
                id="wordGlow"
                x="-120%"
                y="-120%"
                width="340%"
                height="340%"
              >
                <feGaussianBlur stdDeviation="7" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <radialGradient id="topicGradient" cx="35%" cy="25%">
                <stop offset="0%" stopColor="#9f8bff" />
                <stop offset="45%" stopColor="#6757ee" />
                <stop offset="100%" stopColor="#3032a6" />
              </radialGradient>
              <radialGradient id="rootGradient" cx="35%" cy="25%">
                <stop offset="0%" stopColor="#b19cff" />
                <stop offset="42%" stopColor="#6956ef" />
                <stop offset="100%" stopColor="#252783" />
              </radialGradient>
            </defs>

            <g className="web-edges">
              {layout.edges.map((edge) => {
                const source = nodeMap.get(edge.source);
                const target = nodeMap.get(edge.target);
                if (!source || !target) return null;
                return (
                  <line
                    className={edge.type}
                    key={edge.id}
                    x1={source.position.x}
                    y1={source.position.y}
                    x2={target.position.x}
                    y2={target.position.y}
                  />
                );
              })}
            </g>

            <g className="web-nodes">
              {layout.nodes.map((node) => {
                const isTopic = node.type === "topic";
                const isRoot = node.graphRole === "root";
                const selected = node.id === selectedId;
                const radius = isRoot ? 61 : isTopic ? 50 : 12;
                const fill = isTopic
                  ? isRoot
                    ? "url(#rootGradient)"
                    : "url(#topicGradient)"
                  : colors[node.status];
                const labelPosition = !isTopic
                  ? positionLabel(node, node.webCenter)
                  : null;
                return (
                  <g
                    key={node.id}
                    className={`web-node ${isTopic ? "topic-node" : "word-node"} ${selected ? "selected" : ""}`}
                    transform={`translate(${node.position.x}, ${node.position.y})`}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (!draggedRef.current) onSelect?.(node);
                    }}
                    onKeyDown={(event) =>
                      event.key === "Enter" && onSelect?.(node)
                    }
                    role="button"
                    tabIndex="0"
                  >
                    <circle
                      className="node-aura"
                      r={radius + (isTopic ? 8 : 6)}
                      fill={fill}
                      opacity=".18"
                      filter={isTopic ? "url(#topicGlow)" : "url(#wordGlow)"}
                    />
                    <circle className="node-core" r={radius} fill={fill} />
                    <circle
                      className="node-shine"
                      r={Math.max(4, radius - 4)}
                      fill="none"
                      stroke={isTopic ? "#a99cff" : fill}
                      opacity=".65"
                    />
                    {isTopic && (
                      <g
                        className="topic-icon"
                        transform={`translate(0 ${isRoot ? -17 : -13})`}
                      >
                        <TopicIcon topic={node.label} />
                      </g>
                    )}
                    {isTopic ? (
                      <text
                        className="web-topic-label"
                        y={isRoot ? 28 : 25}
                        textAnchor="middle"
                      >
                        {node.label}
                      </text>
                    ) : (
                      <text
                        className="web-word-label"
                        x={labelPosition.x}
                        y={labelPosition.y}
                        textAnchor={labelPosition.anchor}
                      >
                        {splitLabel(node.label).map((line, index) => (
                          <tspan
                            key={line}
                            x={labelPosition.x}
                            dy={index ? 15 : 0}
                          >
                            {line}
                          </tspan>
                        ))}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>
        </div>
        {!preview && (
          <div className="mastery-pill">
            <span>⌁</span> Освоено: <strong>{mastery}%</strong>
          </div>
        )}
      </div>
    </>
  );
}
