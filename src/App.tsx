import React, { useEffect, useState } from "react";
import "./App.css";
import "@vibe/core/tokens";
import { AttentionBox, Loader, Tab, TabList } from "@vibe/core";
import { getFragrances } from "@/api/fragranceApi";
import { ManageFragrancesTab } from "@/components/ManageFragrancesTab";
import { NewOrderTab } from "@/components/NewOrderTab";
import { getContext, getMondayClient } from "@/lib/monday";
import type { Fragrance } from "@/types/fragrance";
import type { MondayContext, MondayListenResponse } from "@/types/monday";

const monday = getMondayClient();
type ActiveTab = "order" | "manage";

const App = () => {
  const [context, setContext] = useState<MondayContext | null>(null);
  const [fragrances, setFragrances] = useState<Fragrance[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>("order");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    monday.execute("valueCreatedForUser");
    monday.listen<MondayContext>("context", (res: MondayListenResponse<MondayContext>) => {
      setContext(res.data);
    });
    getContext().then(setContext).catch(() => {
      setError("Unable to read monday context.");
    });
  }, []);

  const loadFragranceData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getFragrances();
      setFragrances(data);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Failed loading fragrances.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFragranceData().catch(() => {
      // already handled
    });
  }, []);

  return (
    <div className="App">
      <header className="app-header">
        <span className="app-header-icon">🕯️</span>
        <div className="app-header-text">
          <h1>Candlebox Production Builder</h1>
          <p>Gift box order management &amp; fragrance library</p>
        </div>
      </header>

      <div className="tab-bar">
        <TabList
          activeTabId={activeTab === "order" ? 0 : 1}
          onTabChange={(tabId) => setActiveTab(tabId === 0 ? "order" : "manage")}
        >
          <Tab value={0}>New Order</Tab>
          <Tab value={1}>Manage Fragrances</Tab>
        </TabList>
      </div>

      <div className="page-body">
        {error && <AttentionBox type="danger" text={error} />}
        {isLoading ? (
          <Loader size={Loader.sizes.MEDIUM} />
        ) : activeTab === "order" ? (
          <NewOrderTab
            boardId={context?.boardId}
            fragrances={fragrances}
            onSubmitted={() => {
              loadFragranceData().catch(() => undefined);
            }}
          />
        ) : (
          <ManageFragrancesTab fragrances={fragrances} onChanged={setFragrances} />
        )}
      </div>
    </div>
  );
};

export default App;
