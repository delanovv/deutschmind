import { useCallback, useEffect, useRef, useState } from "react";
import {
  addPersonalWord,
  addPersonalWords,
  bootstrapApp,
  clearAccessToken,
  completePractice,
  continueFromNode,
  deletePersonalWord,
  editPersonalWord,
  expandLibrary,
  expandNodeV2,
  getBoundary,
  getCurrentUser,
  getDueReviewsV2,
  getGraph,
  getHealth,
  getJobV2,
  getMaterialsV2,
  getMemory,
  getNeighborsV2,
  getProfile,
  getRecommendations,
  getTodayPractice,
  getWebsV2,
  getWebV2,
  hasAccessToken,
  reorganizeGraph,
  submitReviewV2,
  updateKnowledge,
  updateLearningPreferences,
  updatePreferencesV2,
} from "./api.js";
import AnalyzeTextPanel from "./components/AnalyzeTextPanel.jsx";
import BottomNav from "./components/BottomNav.jsx";
import ErrorState from "./components/ErrorState.jsx";
import KnowledgeGraph from "./components/KnowledgeGraph.jsx";
import LoadingState from "./components/LoadingState.jsx";
import NodeCard from "./components/NodeCard.jsx";
import TodayPanel from "./components/TodayPanel.jsx";
import MemoryPanel from "./components/MemoryPanel.jsx";
import WordLibrary from "./components/WordLibrary.jsx";
import AuthScreen from "./components/AuthScreen.jsx";
import AsyncMaterialPanel from "./components/AsyncMaterialPanel.jsx";

const BRANCH_POLL_INTERVAL_MS = 1_500;
const BRANCH_POLL_TIMEOUT_MS = 3 * 60 * 1_000;

const wait = (milliseconds) =>
  new Promise((resolve) => window.setTimeout(resolve, milliseconds));

async function waitForBranchJob(jobId) {
  const deadline = Date.now() + BRANCH_POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const job = await getJobV2(jobId);
    if (job.status === "completed") return job;
    if (job.status === "failed") {
      throw new Error(job.errorMessage || "AI не смог продолжить ветку.");
    }
    await wait(BRANCH_POLL_INTERVAL_MS);
  }

  throw new Error(
    "AI-задача выполняется слишком долго. Попробуй ещё раз — индикатор больше не будет висеть бесконечно.",
  );
}

export default function App() {
  const [graph, setGraph] = useState({ nodes: [], edges: [] });
  const [boundary, setBoundary] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [practice, setPractice] = useState(null);
  const [memory, setMemory] = useState(null);
  const [profile, setProfile] = useState(null);
  const [backendMode, setBackendMode] = useState("");
  const [user, setUser] = useState(null);
  const [webs, setWebs] = useState([]);
  const [activeTab, setActiveTab] = useState("today");
  const [selectedNode, setSelectedNode] = useState(null);
  const [activeWeb, setActiveWeb] = useState("");
  const [branchLoadingId, setBranchLoadingId] = useState("");
  const [branchSuggestions, setBranchSuggestions] = useState({});
  const expandedThisSession = useRef(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const [
        graphData,
        boundaryData,
        recommendationData,
        practiceData,
        memoryData,
        profileData,
      ] = await Promise.all([
        getGraph(),
        getBoundary(),
        getRecommendations(),
        getTodayPractice(),
        getMemory(),
        getProfile(),
      ]);
      setGraph(graphData);
      setBoundary(boundaryData);
      setRecommendations(recommendationData);
      setPractice(practiceData);
      setMemory(memoryData);
      setProfile(profileData);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const loadV2Dashboard = useCallback(
    async (selectedWebName = "", silent = false) => {
      const selectedWeb = selectedWebName || "";
      if (!silent) setLoading(true);
      setError("");
      try {
        const [webList, due, materials, currentUser] = await Promise.all([
          getWebsV2(),
          getDueReviewsV2(),
          getMaterialsV2(),
          getCurrentUser(),
        ]);
        setWebs(webList);
        setUser(currentUser);
        setProfile({
          profileId: currentUser.id,
          learningPreferences: currentUser.preferences,
        });
        setActiveWeb(selectedWeb);
        const topicNodes = webList.map((web, index) => ({
          id: web.id,
          label: web.name,
          type: "topic",
          topic: web.name,
          status: "boundary",
          knowledgeScore: web.mastery,
          position: { x: 200 + index * 10, y: 200 + index * 10 },
        }));
        let graphData = { nodes: topicNodes, edges: [] };
        if (selectedWeb) {
          const selectedWebEntry = webList.find(
            (web) => web.name === selectedWeb,
          );
          if (selectedWebEntry) {
            const loaded = await getWebV2(selectedWebEntry.id);
            graphData = {
              nodes: [...topicNodes, ...loaded.nodes],
              edges: loaded.edges,
            };
          }
        } else {
          // Load a sample of nodes from each web for the overview spider map
          const allWebData = await Promise.all(
            webList.map((web) =>
              getWebV2(web.id, "?limit=8").catch(() => ({
                nodes: [],
                edges: [],
              })),
            ),
          );
          const allNodes = [
            ...topicNodes,
            ...allWebData.flatMap((d) => d.nodes || []),
          ];
          graphData = { nodes: allNodes, edges: [] };
        }
        setGraph(graphData);
        const recommendationData = due.slice(0, 6).map((node) => ({
          node,
          proximityScore: Math.round(100 - node.knowledgeScore),
          reasonRu: "Слово находится в твоей личной очереди повторений.",
          relatedKnownWords: [],
          suggestedCollocations: node.collocations || [],
        }));
        setBoundary(recommendationData);
        setRecommendations(recommendationData);
        setPractice({
          estimatedMinutes: Math.max(5, Math.round(due.length * 0.8)),
          items: due.map((node, index) => ({
            node,
            priority: 100 - node.knowledgeScore,
            mode: ["recognition", "recall", "context", "production"][index % 4],
            prompt:
              index % 2
                ? `Составь короткое предложение с «${node.label}».`
                : `Как по-немецки: «${node.translationRu}»?`,
          })),
        });
        setMemory({
          totals: {
            words: webList.reduce((sum, web) => sum + web.nodeCount, 0),
            personal: 0,
            sessions: 0,
            importedTexts: materials.length,
          },
          activityByDay: [],
          weakNodes: due.slice(0, 8),
          recentEvents: [],
          importedTexts: materials,
        });
      } catch (requestError) {
        if (/авторизац|сессия/i.test(requestError.message)) {
          clearAccessToken();
          setUser(null);
        } else {
          setError(requestError.message);
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    const handler = () => {
      setUser(null);
      setGraph({ nodes: [], edges: [] });
    };
    window.addEventListener("auth:expired", handler);
    return () => window.removeEventListener("auth:expired", handler);
  }, []);

  useEffect(() => {
    const start = async () => {
      try {
        const health = await getHealth();
        setBackendMode(health.mode);
        if (health.mode === "postgres") {
          if (!hasAccessToken()) {
            setLoading(false);
            return;
          }
          await loadV2Dashboard();
          return;
        }
        if (!localStorage.getItem("deutschmind:schemaVersion")) {
          await bootstrapApp();
          localStorage.removeItem("deutschmind:profile");
        }
        if (localStorage.getItem("deutschmind:schemaVersion") !== "4") {
          await reorganizeGraph();
          localStorage.setItem("deutschmind:schemaVersion", "4");
        }
        await loadDashboard();
      } catch (requestError) {
        setError(requestError.message);
        setLoading(false);
      }
    };

    start();
  }, [loadDashboard, loadV2Dashboard]);

  useEffect(() => {
    if (backendMode === "postgres" && user) {
      if (activeWeb) loadV2Dashboard(activeWeb, true);
      else loadV2Dashboard("", true);
    }
  }, [activeWeb, backendMode, loadV2Dashboard, user?.id]);

  const changeKnowledge = async (id, payload, options = {}) => {
    setSaving(true);
    try {
      if (backendMode === "postgres") {
        const rating =
          payload.status === "known"
            ? 3
            : payload.status === "boundary"
              ? 2
              : 0;
        const updated = await submitReviewV2(id, {
          mode: options.mode || "recognition",
          rating,
        });
        const score = Number(updated.aggregate_score);
        setGraph((current) => ({
          ...current,
          nodes: current.nodes.map((node) =>
            node.id === id
              ? { ...node, status: updated.status, knowledgeScore: score }
              : node,
          ),
        }));
        if (options.select !== false) {
          setSelectedNode((current) =>
            current?.id === id
              ? { ...current, status: updated.status, knowledgeScore: score }
              : current,
          );
        }
        await loadV2Dashboard(activeWeb, true);
        return;
      }
      const updated = await updateKnowledge(id, payload);
      setGraph((current) => ({
        ...current,
        nodes: current.nodes.map((node) => (node.id === id ? updated : node)),
      }));
      if (options.select !== false) setSelectedNode(updated);
      const [newBoundary, newRecommendations] = await Promise.all([
        getBoundary(),
        getRecommendations(),
      ]);
      setBoundary(newBoundary);
      setRecommendations(newRecommendations);
      if (options.refreshPractice !== false)
        setPractice(await getTodayPractice());
      setMemory(await getMemory());
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const addWord = async (payload) => {
    try {
      const node = await addPersonalWord(payload);
      setGraph((current) => ({ ...current, nodes: [...current.nodes, node] }));
      await loadDashboard(true);
      return node;
    } catch (requestError) {
      setError(requestError.message);
      throw requestError;
    }
  };

  const addWords = async (items) => {
    try {
      const data = await addPersonalWords(items);
      if (data.added.length) {
        setGraph((current) => ({
          ...current,
          nodes: [...current.nodes, ...data.added],
        }));
      }
      await loadDashboard(true);
      return data;
    } catch (requestError) {
      setError(requestError.message);
      throw requestError;
    }
  };

  const finishPractice = async (answers) => {
    if (backendMode === "postgres") {
      await loadV2Dashboard(activeWeb, true);
      return;
    }
    await completePractice({ answers });
    const [practiceData, memoryData] = await Promise.all([
      getTodayPractice(),
      getMemory(),
    ]);
    setPractice(practiceData);
    setMemory(memoryData);
  };

  const deleteWord = async (id) => {
    try {
      await deletePersonalWord(id);
      setSelectedNode(null);
      await loadDashboard();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const expandWords = async (topic) => {
    try {
      await expandLibrary({ topic, count: 15 });
      await loadDashboard();
    } catch (requestError) {
      setError(requestError.message);
      throw requestError;
    }
  };

  const editWord = async (id, payload) => {
    try {
      const updated = await editPersonalWord(id, payload);
      setSelectedNode(updated);
      setGraph((current) => ({
        ...current,
        nodes: current.nodes.map((node) => (node.id === id ? updated : node)),
      }));
      setMemory(await getMemory());
      return updated;
    } catch (requestError) {
      setError(requestError.message);
      throw requestError;
    }
  };

  const savePreferences = async (preferences) => {
    setSaving(true);
    try {
      const responseProfile =
        backendMode === "postgres"
          ? await updatePreferencesV2(preferences)
          : await updateLearningPreferences(preferences);
      const updatedProfile =
        backendMode === "postgres"
          ? {
              profileId: responseProfile.id,
              learningPreferences: responseProfile.preferences,
            }
          : responseProfile;
      setProfile(updatedProfile);
      setBranchSuggestions({});
      expandedThisSession.current.clear();
      localStorage.setItem(
        "deutschmind:learningPreferences",
        JSON.stringify(updatedProfile.learningPreferences),
      );
      if (backendMode === "postgres") {
        await loadV2Dashboard(activeWeb, true);
        return updatedProfile;
      }
      const [boundaryData, recommendationData, practiceData] =
        await Promise.all([
          getBoundary(),
          getRecommendations(),
          getTodayPractice(),
        ]);
      setBoundary(boundaryData);
      setRecommendations(recommendationData);
      setPractice(practiceData);
      return updatedProfile;
    } catch (requestError) {
      setError(requestError.message);
      throw requestError;
    } finally {
      setSaving(false);
    }
  };

  const growBranch = async (node) => {
    if (
      !node ||
      node.type === "topic" ||
      expandedThisSession.current.has(node.id)
    )
      return;
    expandedThisSession.current.add(node.id);
    setBranchLoadingId(node.id);
    try {
      if (backendMode === "postgres") {
        const operationId =
          globalThis.crypto?.randomUUID?.() ||
          `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const queued = await expandNodeV2(
          node.id,
          profile?.learningPreferences?.newWordsPerBranch || 5,
          operationId,
        );
        setBranchSuggestions((current) => ({
          ...current,
          [node.id]: {
            pending: true,
            jobId: queued.id,
            reasonRu: "AI расширяет ветку в фоне.",
          },
        }));
        setBranchLoadingId("");

        const completedJob = await waitForBranchJob(queued.id);
        const generatedIds = Object.entries(
          completedJob.result?.nodeIds || {},
        )
          .filter(([clientId, id]) => clientId !== "source" && id !== node.id)
          .map(([, id]) => id);
        const neighborhood = await getNeighborsV2(node.id, 1);
        const currentNodes = new Map(
          graph.nodes.map((currentNode) => [currentNode.id, currentNode]),
        );
        const neighborhoodNodes = neighborhood.nodes.map((item) => ({
          ...currentNodes.get(item.id),
          ...item,
          topic:
            item.topic ||
            currentNodes.get(item.id)?.topic ||
            node.topic ||
            activeWeb ||
            "",
        }));
        const suggestedNode =
          neighborhoodNodes.find((item) => generatedIds.includes(item.id)) ||
          neighborhoodNodes.find((item) => item.id !== node.id) ||
          null;

        setGraph((current) => {
          const nodes = new Map(
            [...current.nodes, ...neighborhoodNodes].map((item) => [
              item.id,
              item,
            ]),
          );
          const edges = new Map(
            [...current.edges, ...neighborhood.edges].map((edge) => [
              edge.id || `${edge.source}:${edge.target}:${edge.type}`,
              edge,
            ]),
          );
          return { nodes: [...nodes.values()], edges: [...edges.values()] };
        });
        setBranchSuggestions((current) => ({
          ...current,
          [node.id]: suggestedNode
            ? { node: suggestedNode, created: true }
            : {
                completed: true,
                reasonRu: "Ветка расширена. Новые связи уже добавлены в паутину.",
              },
        }));
        await loadV2Dashboard(activeWeb, true);
        return;
      }
      const result = await continueFromNode(node.id);
      setBranchSuggestions((current) => ({ ...current, [node.id]: result }));
      if (result.created) {
        const graphData = await getGraph();
        setGraph(graphData);
        const [newBoundary, newRecommendations] = await Promise.all([
          getBoundary(),
          getRecommendations(),
        ]);
        setBoundary(newBoundary);
        setRecommendations(newRecommendations);
      }
    } catch (requestError) {
      expandedThisSession.current.delete(node.id);
      setBranchSuggestions((current) => ({
        ...current,
        [node.id]: { error: requestError.message },
      }));
    } finally {
      setBranchLoadingId("");
    }
  };

  const selectNode = (node) => {
    if (!node) return;
    if (node.type === "topic") {
      if (node.label !== activeWeb) setActiveWeb(node.label);
      setSelectedNode(null);
      return;
    }
    setSelectedNode(node);
    growBranch(node);
  };

  const navigateNode = (node) => {
    if (!node) return;
    const nextWeb = node.type === "topic" ? node.label : node.topic;
    if (nextWeb && nextWeb !== activeWeb) setActiveWeb(nextWeb);
    setSelectedNode(node.type === "topic" ? null : node);
    if (node.type !== "topic") growBranch(node);
  };

  if (loading) return <LoadingState />;
  if (backendMode === "postgres" && !user) {
    return (
      <AuthScreen
        onAuthenticated={(authenticatedUser) => {
          setUser(authenticatedUser);
          loadV2Dashboard();
        }}
      />
    );
  }
  if (error && !graph.nodes.length)
    return (
      <ErrorState
        message={error}
        onRetry={() =>
          backendMode === "postgres" ? loadV2Dashboard() : loadDashboard()
        }
      />
    );

  return (
    <div className="app-frame">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <header className="app-header">
        <div className="brand">
          <div className="brand-mark">D</div>
          <div>
            <strong>DeutschMind</strong>
            <span>Карта твоего немецкого мозга</span>
          </div>
        </div>
        <button className="avatar" onClick={() => setActiveTab("memory")}>
          DM
        </button>
      </header>
      <main className="app-content">
        {error && (
          <div className="inline-error">
            {error}
            <button onClick={() => setError("")}>×</button>
          </div>
        )}
        {activeTab === "today" && (
          <TodayPanel
            practice={practice}
            recommendations={recommendations}
            onAnswer={(id, payload) =>
              changeKnowledge(id, payload, {
                select: false,
                refreshPractice: false,
              })
            }
            onComplete={finishPractice}
            onSelect={selectNode}
          />
        )}
        {activeTab === "map" && (
          <section className="screen-section map-screen">
            <div className="plain-page-header">
              <span>ТВОЙ СЛОВАРЬ</span>
              <h1>Карта</h1>
              <p>
                Ищи, добавляй и уточняй слова. Граф показывает связи, список
                помогает быстро работать.
              </p>
            </div>
            <KnowledgeGraph
              graph={graph}
              onSelect={selectNode}
              selectedId={selectedNode?.id}
              activeWeb={activeWeb}
              onWebChange={setActiveWeb}
            />
            <WordLibrary
              graph={graph}
              onSelect={selectNode}
              onAdd={addWord}
              onExpand={expandWords}
              readOnly={backendMode === "postgres"}
            />
          </section>
        )}
        {activeTab === "import" &&
          (backendMode === "postgres" ? (
            <AsyncMaterialPanel />
          ) : (
            <AnalyzeTextPanel onAddWord={addWord} onAddWords={addWords} />
          ))}
        {activeTab === "memory" && (
          <MemoryPanel
            memory={memory}
            profile={profile}
            user={user}
            onSelect={selectNode}
            onSavePreferences={savePreferences}
            saving={saving}
            onLogout={
              backendMode === "postgres"
                ? () => {
                    clearAccessToken();
                    setUser(null);
                    setGraph({ nodes: [], edges: [] });
                  }
                : null
            }
          />
        )}
      </main>
      <BottomNav active={activeTab} onChange={setActiveTab} />
      <NodeCard
        node={selectedNode}
        graph={graph}
        onClose={() => setSelectedNode(null)}
        onNavigate={navigateNode}
        onKnowledgeChange={changeKnowledge}
        onEdit={editWord}
        onDelete={deleteWord}
        saving={saving}
        branchLoading={branchLoadingId === selectedNode?.id}
        branchSuggestion={
          selectedNode ? branchSuggestions[selectedNode.id] : null
        }
        onRetryBranch={() => {
          if (!selectedNode) return;
          expandedThisSession.current.delete(selectedNode.id);
          growBranch(selectedNode);
        }}
      />
    </div>
  );
}
