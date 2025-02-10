import type { TimeDateSettings } from "types/settings";
import type { Countdown } from "./countdown.types";
import { useState, useEffect, useRef, lazy } from "react";
import { dispatchCustomEvent, getRandomString } from "utils";
import { getSetting } from "services/settings";
import { formatDate } from "services/timeDate";
import * as chromeStorage from "services/chromeStorage";
import Icon from "components/Icon";
import CreateButton from "components/CreateButton";
import Dropdown from "components/Dropdown";
import "./countdown.css";
import useWorker from "../../useWorker";

const Form = lazy(() => import("./Form"));

export default function Countdown({ visible, locale, animDirection, toggleIndicator }) {
  const [countdowns, setCountdowns] = useState<Countdown[]>([]);
  const { initWorker, destroyWorkers, updateWorkerCallback } = useWorker(updateCountdowns);
  const running = useRef(false);

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    if (!countdowns.length) {
      running.current = false;
      destroyWorkers();
      return;
    }
    updateWorkerCallback("countdown", updateCountdowns);


    if (running.current) {
      return;
    }
    running.current = true;
    initWorker({ id: "countdown", type: "clock" });
  }, [countdowns]);

  async function init() {
    const countdowns = await chromeStorage.get("countdowns");

    if (countdowns?.length) {
      startCountdowns(countdowns);
      toggleIndicator("countdown", true);
      dispatchCustomEvent("indicator-visibility", true);
    }

    chromeStorage.subscribeToChanges(({ countdowns }) => {
      if (!countdowns) {
        return;
      }

      if (countdowns.newValue) {
        startCountdowns(countdowns.newValue);
      }
      else {
        setCountdowns([]);
      }
    });
  }

  function startCountdowns(countdowns: Countdown[]) {
    const startDate = Date.now();

    setCountdowns(countdowns.map(countdown => {
      const date = new Date(countdown.dateString);
      const dateNumber = date.getTime();
      const diff = Math.round(Math.abs(dateNumber - startDate) / 1000);

      return {
        ...countdown,
        ...parseDateDiff(diff, countdown.view),
        view: countdown.view ?? "year",
        id: getRandomString(),
        date: getCountdownDateString(date),
        diff
      };
    }));
  }

  function updateCountdowns() {
    let modified = false;
    const startDate = Date.now();
    const updatedCountdowns = countdowns.map(countdown => {
      const endDate = new Date(countdown.dateString).getTime();
      const diff = Math.round(Math.abs(endDate - startDate) / 1000);

      if (countdown.willBeInPast) {
        countdown.isInPast = true;
        delete countdown.willBeInPast;
        modified = true;
      }
      else if (diff === 0) {
        countdown.willBeInPast = true;
      }
      return {
        ...countdown,
        ...parseDateDiff(diff, countdown.view),
        diff
      };
    });

    setCountdowns(updatedCountdowns);

    if (modified) {
      saveCountdowns(updatedCountdowns);
    }
  }

  function parseDateDiff(duration: number, view: Countdown["view"]) {
    let years = 0;
    let months = 0;
    let days = 0;
    let hours = 0;
    let minutes = 0;

    if (view === "year") {
      years = Math.floor(duration / 31540000);
      duration %= 31540000;
      months = Math.floor(duration / 2628000);
      duration %= 2628000;
      days = Math.floor(duration / 86400);
      duration %= 86400;
      hours = Math.floor(duration / 3600);
      duration %= 3600;
      minutes = Math.floor(duration / 60);
      duration %= 60;
    }
    else if (view === "month") {
      months = Math.floor(duration / 2628000);
      duration %= 2628000;
      days = Math.floor(duration / 86400);
      duration %= 86400;
      hours = Math.floor(duration / 3600);
      duration %= 3600;
      minutes = Math.floor(duration / 60);
      duration %= 60;
    }
    else if (view === "day") {
      days = Math.floor(duration / 86400);
      duration %= 86400;
      hours = Math.floor(duration / 3600);
      duration %= 3600;
      minutes = Math.floor(duration / 60);
      duration %= 60;
    }
    else if (view === "hour") {
      hours = Math.floor(duration / 3600);
      duration %= 3600;
      minutes = Math.floor(duration / 60);
      duration %= 60;
    }
    else if (view === "minute") {
      minutes = Math.floor(duration / 60);
      duration %= 60;
    }
    const seconds = duration;

    const parts = {
      years: years > 99 ? 99 : years,
      months,
      days,
      hours,
      minutes,
      seconds
    };

    // @ts-ignore
    if (!Intl.DurationFormat) {
      // @ts-ignore
      const durationItems = new Intl.DurationFormat("en-US", { style: "long" }).formatToParts(parts);
      const durationParts = {
        second: {
          value: 0,
          unit: "seconds"
        }
      };

      for (const item of durationItems) {
        if (item.unit) {
          durationParts[item.unit] ??= {};

          if (item.type === "integer") {
            durationParts[item.unit].value = parts[`${item.unit}s`];
          }
          else if (item.type === "unit") {
            durationParts[item.unit].unit = item.value;
          }
        }
      }

      // Fill missing parts with 0 to overwrite old values
      for (const key in parts) {
        durationParts[key.slice(0, -1)] ??= {
          value: 0,
          unit: key
        };
      }

      return durationParts;
    }
    else {
      const durationParts = {};

      for (const key in parts) {
        durationParts[key.slice(0, -1)] = {
          value: parts[key],
          unit: parts[key] === 0 || parts[key] > 1 ? key : key.slice(0, -1)
        };
      }
      return durationParts;
    }
  }

  function showForm() {
    dispatchCustomEvent("fullscreen-modal", {
      id: "countdown",
      shouldToggle: true,
      component: Form,
      params: { locale, createCountdown }
    });
  }

  function createCountdown(countdown: Countdown) {
    const newCountdowns = [
      {
        ...countdown,
        ...parseDateDiff(countdown.diff, "year"),
        date: getCountdownDateString(new Date(countdown.dateString))
      },
      ...countdowns
    ];

    setCountdowns(newCountdowns);
    saveCountdowns(newCountdowns);

    toggleIndicator("countdown", true);
    dispatchCustomEvent("indicator-visibility", true);
  }

  function removeCountdown(index: number) {
    const newCountdowns = countdowns.toSpliced(index, 1);

    if (!newCountdowns.length) {
      toggleIndicator("countdown", false);
      dispatchCustomEvent("indicator-visibility", false);
    }
    setCountdowns(newCountdowns);
    saveCountdowns(newCountdowns);
  }

  function getCountdownDateString(date: Date) {
    const { dateLocale } = getSetting("timeDate") as TimeDateSettings;

    return formatDate(date.getTime(), {
      locale: dateLocale,
      includeTime : !!(date.getHours() || date.getMinutes())
    });
  }

  function selectView(view: Countdown["view"], index: number) {
    const newCountdowns = countdowns.with(index, {
      ...countdowns[index],
      ...parseDateDiff(countdowns[index].diff, view),
      view
    });

    setCountdowns(newCountdowns);
    saveCountdowns(newCountdowns);
  }

  function saveCountdowns(countdowns: Countdown[]) {
    chromeStorage.set({
      countdowns: countdowns.map(countdown => ({
        title: countdown.title,
        dateString: countdown.dateString,
        isInPast: countdown.isInPast,
        view: countdown.view
      }))
    });
  }

  function renderCountdowns() {
    if (!countdowns.length) {
      return <p className="top-panel-item-content countdowns-message">{locale.countdown.no_countdowns_message}</p>;
    }
    return (
      <div className="countdown-items-container">
        <ul className="top-panel-item-content countdown-items">
          {countdowns.map((countdown, i) => (
            <li className="countdown-item" key={countdown.id}>
              {countdown.title && <div className="countdown-item-title">{countdown.title}</div>}
              <div className="countdown-item-timer">
                {countdown.isInPast && (
                  <div className="countdown-item-timer-part">
                    <span className="countdown-item-timer-digit">-</span>
                  </div>
                )}
                {countdown.year?.value > 0 && (
                  <div className="countdown-item-timer-part">
                    <span className="countdown-item-timer-digit">{countdown.year.value}</span>
                    <span>{countdown.year.unit}</span>
                  </div>
                )}
                {countdown.month?.value > 0 && (
                  <div className="countdown-item-timer-part">
                    <span className="countdown-item-timer-digit">{countdown.month.value}</span>
                    <span>{countdown.month.unit}</span>
                  </div>
                )}
                {countdown.day?.value > 0 && (
                  <div className="countdown-item-timer-part">
                    <span className="countdown-item-timer-digit">{countdown.day.value}</span>
                    <span>{countdown.day.unit}</span>
                  </div>
                )}
                {countdown.hour?.value > 0 && (
                  <div className="countdown-item-timer-part">
                    <span className="countdown-item-timer-digit">{countdown.hour.value}</span>
                    <span>{countdown.hour.unit}</span>
                  </div>
                )}
                {countdown.minute?.value > 0 && (
                  <div className="countdown-item-timer-part">
                    <span className="countdown-item-timer-digit">{countdown.minute.value}</span>
                    <span>{countdown.minute.unit}</span>
                  </div>
                )}
                <div className="countdown-item-timer-part seconds">
                  <span className="countdown-item-timer-digit">{countdown.second.value}</span>
                  <span>{countdown.second.unit}</span>
                </div>
              </div>
              <div className="countdown-item-date">{countdown.date}</div>
              <Dropdown container={{ className: "countdown-item-dropdown" }} usePortal>
                <div className="dropdown-group">
                  <div className="countdown-item-dropdown-title">View</div>
                </div>
                <div className="dropdown-group">
                  <button className={`btn text-btn dropdown-btn${countdown.view === "year" ? " active" : ""}`}
                    onClick={() => selectView("year", i)}>Full</button>
                  <button className={`btn text-btn dropdown-btn${countdown.view === "month" ? " active" : ""}`}
                    onClick={() => selectView("month", i)}>Month</button>
                  <button className={`btn text-btn dropdown-btn${countdown.view === "day" ? " active" : ""}`}
                    onClick={() => selectView("day", i)}>Day</button>
                  <button className={`btn text-btn dropdown-btn${countdown.view === "hour" ? " active" : ""}`}
                    onClick={() => selectView("hour", i)}>Hour</button>
                  <button className={`btn text-btn dropdown-btn${countdown.view === "minute" ? " active" : ""}`}
                    onClick={() => selectView("minute", i)}>Minute</button>
                  <button className={`btn text-btn dropdown-btn${countdown.view === "second" ? " active" : ""}`}
                    onClick={() => selectView("second", i)}>Second</button>
                </div>
                <button className="btn icon-text-btn dropdown-btn countdown-item-dropdown-remove-btn" onClick={() => removeCountdown(i)}>
                  <Icon id="trash"/>
                  <span>{locale.global.remove}</span>
                </button>
              </Dropdown>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className={`container-body top-panel-item countdown${visible ? " visible" : ""}${animDirection ? ` ${animDirection}` : ""}`}>
      <CreateButton onClick={showForm} attrs={{ "data-modal-initiator": "" }}></CreateButton>
      {renderCountdowns()}
    </div>
  );
}
