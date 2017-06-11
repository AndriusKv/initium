import { Component } from "@angular/core";

@Component({
    selector: "app",
    template: `
        <background [setting]="settings.background"></background>
        <time [setting]="settings.time"></time>
        <calendar-reminders
            [setting]="settings.time"
            [newReminders]="reminders">
        </calendar-reminders>
        <main-block [setting]="settings.mainBlock"></main-block>
        <weather [setting]="settings.weather"></weather>
        <todo></todo>
        <widget-menu
            (toggle)="onToggle($event)"
            (setting)="onSetting($event)"
            (reminders)="onReminders($event)">
        </widget-menu>
        <upper-block
            [toggleComp]="toggle.upper"
            (hide)="onHide($event)">
        </upper-block>
    `
})
export class App {
    toggle: any = {};
    settings: any = {};
    reminders: any;

    onToggle(whatToToggle) {
        this.toggle[whatToToggle] = !this.toggle[whatToToggle] || false;
    }

    onSetting(settings) {
        this.settings = Object.assign({}, settings);
    }

    onReminders(reminders) {
        this.reminders = reminders;
    }

    onHide(component) {
        this.toggle[component] = false;
    }
}
