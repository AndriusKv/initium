import { useState, useEffect, useRef } from "react";
import { convertTemperature } from "services/weather";
import * as focusService from "services/focus";
import Icon from "components/Icon";
import Spinner from "components/Spinner";
import Dropdown from "components/Dropdown";
import "./more-weather.css";

export default function MoreWeather({ current, more, units, speedUnits, view, locale, selectView, toggleUnits, hide }) {
  const [ready, setReady] = useState(false);
  const [tempRange, setTempRange] = useState();
  const container = useRef(null);

  useEffect(() => {
    if (ready) {
      focusService.focusFirstElement(container.current);
    }
  }, [ready]);

  useEffect(() => {
    if (!more) {
      return;
    }
    const tempRange = more.hourly.reduce((range, item) => {
      const temp = units === "C" ? item.temperature : convertTemperature(item.temperature, "C");

      if (temp < range.min) {
        range.min = temp;
      }

      if (temp > range.max) {
        range.max = temp;
      }
      return range;
    }, { min: Infinity, max: -Infinity });

    setReady(true);
    setTempRange({ min: tempRange.min - 2, max: tempRange.max + 1 });
  }, [more]);

  function getTempPath(closePath) {
    let path = "";
    let offset = 0;

    for (const [index, item] of Object.entries(more.hourly)) {
      const temp = units === "C" ? item.temperature : convertTemperature(item.temperature, "C");
      const y = getSvgY(temp);
      const numIndex = Number(index);

      // 576 = container width; 24 = item count
      // 24 = 576 / 24
      path += ` L${numIndex * 24 + offset} ${y}`;

      if (offset === 0) {
        offset = 12;
      }
      else if (numIndex + 2 === more.hourly.length) {
        offset = 0;
      }
    }

    if (closePath) {
      return `M${path.slice(2)} L576 100 L0 100 Z`;
    }
    return `M${path.slice(2)}`;
  }

  function getSvgY(current, offset = 0) {
    const maxRange = tempRange.max - tempRange.min;
    const range = current - tempRange.min;

    return (100 - (range / maxRange * 100 * 0.6) - offset).toFixed(2);
  }

  function renderWindView(items) {
    const [minSpeed, maxSpeed] = items.reduce(([minSpeed, maxSpeed], item) => {
      if (item.wind.speed > maxSpeed) {
        maxSpeed = item.wind.speed;
      }

      if (item.wind.speed < minSpeed) {
        minSpeed = item.wind.speed;
      }
      return [minSpeed, maxSpeed];
    }, [Infinity, -Infinity]);

    return (
      <div className="weather-more-hourly-view weather-more-hourly-wind-view">
        {items.map(({ id, wind }) => {
          let ratio = 1;

          if (minSpeed !== maxSpeed) {
            ratio = (wind.speed - minSpeed) / (maxSpeed - minSpeed);
          }
          return (
            <div className="weather-more-hourly-wind-view-item" key={id}>
              <div className="weather-more-hourly-wind-view-item-speed">{Math.round(wind.speed)} {speedUnits}</div>
              <svg viewBox="0 0 24 24" className="weather-more-hourly-wind-view-item-icon"
                style={{ "--degrees": wind.direction.degrees, "--ratio": ratio }}>
                <title>{wind.direction.name}</title>
                <use href="#arrow-up"></use>
              </svg>
            </div>
          );
        })}
      </div>
    );
  }

  function renderTempValues() {
    return more.hourly.map((item, index) => {
      const temp = units === "C" ? item.temperature : convertTemperature(item.temperature, "C");
      const x = `calc(${index * 24 + 12}px - ${Math.round(item.temperature).toString().length / 2}ch)`;
      const y = `calc(${getSvgY(temp, 6)}px - 0.5ch)`;

      if (index % 3 === 1) {
        return <text className="weather-more-hourly-temp-view-text" style={{ transform: `translate(${x}, ${y})` }}
          key={item.id}>{Math.round(item.temperature)}°</text>;
      }
      return null;
    });
  }

  function renderHourlyView() {
    if (view === "temp") {
      return (
        <svg className="weather-more-hourly-view weather-more-hourly-temp-view">
          {renderTempValues()}
          <path fill="none" stroke="var(--color-primary)" strokeWidth="2px" d={getTempPath()}></path>
          <path fill="var(--color-primary-0-40)" d={getTempPath(true)}></path>
        </svg>
      );
    }
    else if (view === "prec") {
      return (
        <div className="weather-more-hourly-view">
          <div className="weather-more-hourly-prec-view-values">
            {more.hourly.filter((_, index) => index % 3 === 1).map(item => (
              <div className="weather-more-hourly-prec-view-value" key={item.id}>{item.precipitation}%</div>
            ))}
          </div>
          <div className="weather-more-hourly-prec-view-graph">
            {more.hourly.slice(0, -1).map(item => (
              <div className="weather-more-hourly-prec-view-graph-bar" key={item.id} style={{ height: `${item.precipitation}%` }}></div>
            ))}
          </div>
        </div>
      );
    }
    else if (view === "wind") {
      return renderWindView(more.hourly.filter((_, index) => index % 3 === 1));
    }
    return null;
  }

  return (
    <div className="weather-transition-target weather-more-info" ref={container}>
      <div className="container-header weather-more-current">
        <div className="weather-more-current-icon-container">
          <img src={current.icon} className="weather-more-current-icon" alt="" width="100px" height="100px" loading="lazy"/>
        </div>
        <div className="weather-more-current-main">
          <div className="weather-more-current-city">{current.city}</div>
          <div className="weather-more-current-main-info">
            <div className="weather-more-current-temperature">
              <div className="weather-more-current-temperature-value">{Math.round(current.temperature)}</div>
              <div className="weather-more-current-temperature-units">°{units}</div>
            </div>
            <div className="weather-more-current-secondary">
              <div className="weather-more-current-secondary-item">
                <span className="weather-more-current-secondary-name">{locale.weather.precipitation}:</span>
                <span>{current.precipitation ?? 0}%</span>
              </div>
              <div className="weather-more-current-secondary-item">
                <span className="weather-more-current-secondary-name">{locale.weather.humidity}:</span>
                <span>{current.humidity}%</span>
              </div>
              <div className="weather-more-current-secondary-item">
                <span className="weather-more-current-secondary-name">{locale.weather.wind}:</span>
                <span className="weather-more-current-wind">
                  <span>{Math.round(current.wind.speed)} {speedUnits}</span>
                  <svg viewBox="0 0 24 24" className="weather-more-current-wind-icon"
                    style={{ "--degrees": current.wind.direction.degrees }}>
                    <title>{current.wind.direction.name}</title>
                    <use href="#arrow-up"></use>
                  </svg>
                </span>
              </div>
            </div>
          </div>
          <div className="weather-more-current-description">{current.description}</div>
        </div>
      </div>
      {ready ? (
        <>
          <div className="container-body weather-more-hourly-view-container">
            <ul className="weather-more-hourly-view-top">
              <li>
                <button className={`btn text-btn weather-more-hourly-view-top-btn${view === "temp" ? " active" : ""}`}
                  onClick={() => selectView("temp")}>{locale.weather.temperature}</button>
              </li>
              <li>
                <button className={`btn text-btn weather-more-hourly-view-top-btn${view === "prec" ? " active" : ""}`}
                  onClick={() => selectView("prec")}>{locale.weather.precipitation}</button>
              </li>
              <li>
                <button className={`btn text-btn weather-more-hourly-view-top-btn${view === "wind" ? " active" : ""}`}
                  onClick={() => selectView("wind")}>{locale.weather.wind}</button>
              </li>
            </ul>
            {renderHourlyView()}
            <div className="weather-more-hourly-view-time">
              {more.hourly.filter((_, index) => index % 3 === 1).map(item => (
                <div className="weather-more-hourly-view-time-item" key={item.id}>{item.time}</div>
              ))}
            </div>
          </div>
          <div className="container-footer weather-more-daily">
            {more.daily.map(item => (
              <div className="weather-more-daily-weekday" key={item.id}>
                <div className="weather-more-daily-weekday-name">{item.weekday}</div>
                <img src={item.icon} alt={item.description} className="weather-more-daily-weekday-icon" width="56px" height="56px" loading="lazy"/>
                <div className="weather-more-daily-weekday-temp">
                  <div>{Math.round(item.temperature.min)}°</div>
                  <div>{Math.round(item.temperature.max)}°</div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : <Spinner className="weather-more-spinner"/>}
      <Dropdown container={{ className: "weather-more-settings" }} toggle={{ iconId: "settings", title: locale.global.settings }}>
        <label className="dropdown-group weather-more-setting">
          <div>{locale.weather.temp_setting_label}</div>
          <input type="checkbox" className="sr-only toggle-input"
            checked={units === "F"}
            onChange={() => toggleUnits("temp")}/>
          <div className="toggle">
            <div className="toggle-item">°C</div>
            <div className="toggle-item">°F</div>
          </div>
        </label>
        <label className="dropdown-group weather-more-setting">
          <div>{locale.weather.wind_setting_label}</div>
          <input type="checkbox" className="sr-only toggle-input"
            checked={speedUnits === "ft/s"}
            onChange={() => toggleUnits("wind")}/>
          <div className="toggle">
            <div className="toggle-item">m/s</div>
            <div className="toggle-item">ft/s</div>
          </div>
        </label>
      </Dropdown>
      <button className="btn icon-btn weather-more-close-btn" onClick={hide} title={locale.global.close}>
        <Icon id="cross"/>
      </button>
    </div>
  );
}
