import { useState, useEffect, useLayoutEffect, useRef, lazy, Suspense, type ReactNode } from "react";
import { getSetting, updateSetting } from "services/settings";
import { handleZIndex } from "services/zIndex";
// import { hasUsers } from "services/twitter";
import { hasStoredFeeds } from "services/feeds";
import Icon from "components/Icon";
import Resizer from "components/Resizer";
import Spinner from "components/Spinner";
import "./main-panel.css";
import Sidebar from "./Sidebar";
import type { AppearanceSettings, MainPanelSettings } from "types/settings";

const TopSites = lazy(() => import("./TopSites"));
const Notepad = lazy(() => import("./Notepad"));
// const Twitter = lazy(() => import("./Twitter"));
const RssFeed = lazy(() => import("./RssFeed"));

type Props = {
  settings: MainPanelSettings,
  locale: any
}

type Tab = {
  id: string,
  title: string,
  iconId: string,
  disabled?: boolean,
  renderPending?: boolean,
  expandable?: boolean,
  indicatorVisible?: boolean,
  delay?: number,
  firstRender?: boolean
}

type Tabs = { [key: string]: Tab };

type ActiveTab = {
  id: string,
  expanded?: boolean,
  collapsing?: boolean,
  manuallySelected?: boolean,
}

export default function MainPanel({ settings, locale }: Props) {
  const [activeTab, setActiveTab] = useState((): ActiveTab => {
    return { id: localStorage.getItem("mainPanelTab") ?? "topSites" };
  });
  const [tabs, setTabs] = useState(() => getTabs());
  const [resizerEnabled, setResizerEnabled] = useState(false);
  const tabTimeouts = useRef({});
  const containerRef = useRef(null);
  const tabExpandable = tabs[activeTab.id]?.expandable;

  useLayoutEffect(() => {
    function selectTopSitesTab() {
      setActiveTab({ id: "topSites" });
      localStorage.setItem("mainPanelTab", "topSites");
    }

    if (settings.height) {
      containerRef.current.style.setProperty("--height", `${settings.height}px`);
    }

    window.addEventListener("enable-persistent-site-edit", selectTopSitesTab);

    return () => {
      window.removeEventListener("enable-persistent-site-edit", selectTopSitesTab);
    };
  }, []);

  useEffect(() => {
    let firstEnabledTab = "";
    let activeTabDisabled = false;
    let disabledComponentCount = 0;
    const newTabs: Tabs = {};
    const componentEntries = Object.entries(settings.components);

    for (const [id, { disabled }] of componentEntries) {
      const tab = tabs[id];
      newTabs[id] = {
        ...tab,
        disabled
      };

      if (disabled) {
        disabledComponentCount += 1;

        if (activeTab.id === tab.id) {
          activeTabDisabled = true;
        }
      }
      else if (!firstEnabledTab) {
        firstEnabledTab = tab.id;
      }
    }

    if (activeTabDisabled || activeTab.id === "twitter" || activeTab.id === "" && disabledComponentCount >= componentEntries.length - 1) {
      selectTab(firstEnabledTab);
    }
    setTabs(newTabs);
  }, [settings.components]);

  useEffect(() => {
    if (resizerEnabled) {
      setResizerEnabled(false);
    }

    if (tabs.topSites.renderPending && activeTab.id === "topSites") {
      setTabs({
        ...tabs,
        topSites: {
          ...tabs.topSites,
          renderPending: false
        }
      });
    }
    else if (tabs.notepad.renderPending && activeTab.id === "notepad") {
      setTabs({
        ...tabs,
        notepad: {
          ...tabs.notepad,
          renderPending: false
        }
      });
    }

    // if (tabs.twitter.renderPending) {
    //   initComponent("twitter", hasUsers);
    // }

    if (tabs.rssFeed.renderPending) {
      initComponent("rssFeed", hasStoredFeeds);
    }
  }, [activeTab.id]);

  async function initComponent(id: string, callback: () => Promise<boolean>) {
    const tab = { ...tabs[id] };
    let delay = -1;

    if (activeTab.id === id) {
      delay = activeTab.manuallySelected ? 1 : 2000;
      clearTimeout(tabTimeouts.current[id]);
    }
    else if (tab.firstRender && await callback()) {
      delay = tab.delay;
      tab.firstRender = false;
    }

    if (delay > 0) {
      tabTimeouts.current[id] = setTimeout(() => {
        setTabs({
          ...tabs,
          [id]: {
            ...tab,
            renderPending: false
          }
        });
      }, delay);
    }
  }

  function getTabs() {
    const tabs: Tabs = {
      topSites: {
        id: "topSites",
        title: "Top sites",
        iconId: "top-sites",
        renderPending: true
      },
      notepad: {
        id: "notepad",
        title: "Notepad",
        iconId: "notepad",
        expandable: true,
        renderPending: true
      },
      // twitter: {
      //   id: "twitter",
      //   title: "Twitter",
      //   iconId: "twitter",
      //   delay: 600000,
      //   expandable: true,
      //   firstRender: true,
      //   renderPending: true
      // },
      rssFeed: {
        id: "rssFeed",
        title: "RSS feed",
        iconId: "rss",
        delay: 1200000,
        expandable: true,
        firstRender: true,
        renderPending: true
      }
    };

    for (const tab of Object.values(tabs)) {
      tab.disabled = settings.components[tab.id].disabled;
    }
    return tabs;
  }

  function selectTab(id: string) {
    const newId = id === activeTab.id ? "" : id;

    if (tabs[newId]?.indicatorVisible) {
      setTabs({
        ...tabs,
        [newId]: {
          ...tabs[newId],
          indicatorVisible: false
        }
      });
    }
    setActiveTab({ id: newId, manuallySelected: true });
    localStorage.setItem("mainPanelTab", newId);
  }

  function expandTab() {
    const willExpand = !activeTab.expanded;

    if (willExpand) {
      setActiveTab({
        ...activeTab,
        expanded: willExpand
      });
      setResizerEnabled(false);
    }
    else {
      const { animationSpeed } = getSetting("appearance") as AppearanceSettings;

      setActiveTab({
        ...activeTab,
        expanded: false,
        collapsing: true
      });

      setTimeout(() => {
        setActiveTab({
          ...activeTab,
          collapsing: false,
          expanded: false
        });
      }, 200 * animationSpeed);
    }
  }

  function showIndicator(id: string) {
    if (id !== activeTab.id) {
      setTabs({
        ...tabs,
        [id]: {
          ...tabs[id],
          indicatorVisible: true
        } });
    }
  }

  function toggleResizer() {
    setResizerEnabled(!resizerEnabled);
  }

  function saveHeight(height: number) {
    updateSetting("mainPanel", { height });
  }

  function renderTopSites() {
    const tab = tabs.topSites;

    if (tab.disabled || tab.renderPending) {
      return null;
    }
    return (
      <div className={`main-panel-item top-sites-container${activeTab.id === tab.id ? "" : " hidden"}`}>
        <Suspense fallback={null}>
          <TopSites settings={settings.components.topSites} locale={locale}/>
        </Suspense>
      </div>
    );
  }

  function renderComponent(id: string, component: ReactNode, showSpinner?: boolean) {
    const tab = tabs[id];

    if (tab.disabled) {
      return null;
    }
    const fallback = showSpinner ?
      <Spinner size="24px"/> :
      <Icon id={tab.iconId} className="main-panel-item-splash-icon animate"/>;

    return (
      <div className={`container main-panel-item${activeTab.id === id ? "" : " hidden"}`}>
        {tab.renderPending ? fallback : <Suspense fallback={fallback}>{component}</Suspense>}
      </div>
    );
  }

  function renderNavigation() {
    if (settings.navHidden || settings.navDisabled) {
      return;
    }
    return (
      <ul className="main-panel-nav">
        {Object.values(tabs).map(tab => (
          tab.disabled ? null : (
            <li key={tab.id}>
              <button className={`btn icon-btn panel-item-btn${tab.indicatorVisible ? " indicator" : ""}`}
                onClick={() => selectTab(tab.id)} aria-label={tab.title} data-tooltip={tab.title}>
                <Icon id={tab.iconId} className="panel-item-btn-icon"/>
              </button>
            </li>
          )
        ))}
      </ul>
    );
  }

  return (
    <div className={`main-panel${tabExpandable ? " expandable" : ""}${activeTab.expanded ? " expanded" : ""}${settings.navHidden || settings.navDisabled ? " nav-hidden" : ""}${activeTab.collapsing ? " collapsing" : ""}`}
      onClick={event => handleZIndex(event, "main-panel")} ref={containerRef}>
      {renderNavigation()}
      {tabExpandable && (
        <Sidebar expanded={activeTab.expanded} locale={locale} expandTab={expandTab} resizerEnabled={resizerEnabled} toggleResizer={toggleResizer}/>
      )}
      {renderTopSites()}
      {renderComponent("notepad", <Notepad locale={locale}/>, true)}
      {/* {renderComponent("twitter", <Twitter showIndicator={showIndicator}/>)} */}
      {renderComponent("rssFeed", <RssFeed locale={locale} showIndicator={showIndicator}/>)}
      {resizerEnabled && <Resizer saveHeight={saveHeight}/>}
    </div>
  );
}
