import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { InAppNotification, InAppNotificationService } from '../../services/in-app-notification/in-app-notification.service';
import { StorageService } from '../../services/storage/storage.service';

/**
 * 2026-08-18 IN-APP NOTIFICATION DOCK.
 *
 * Ionic-rendered, draggable, dismissible. It defaults to the bottom-right
 * corner and the user drags it by the header to any convenient space; the
 * position lives for the session (component instance).
 */
@Component({
  selector: 'app-in-app-notifications',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './in-app-notifications.component.html',
  styleUrls: ['./in-app-notifications.component.scss'],
})
export class InAppNotificationsComponent implements OnInit, OnDestroy {
  notifications: InAppNotification[] = [];
  position = { x: 0, y: 0 };

  @ViewChild('dock', { static: false }) dockEl?: ElementRef<HTMLElement>;

  private sub: Subscription | null = null;
  private initialized = false;
  private drag = { active: false, startX: 0, startY: 0, originX: 0, originY: 0 };

  private static readonly POS_KEY = 'rolodex_notify_dock_pos';

  constructor(
    private readonly service: InAppNotificationService,
    private readonly storage: StorageService,
  ) {}

  ngOnInit(): void {
    // Restore the user's chosen corner from the previous session.
    void this.storage.get<{ x: number; y: number }>(InAppNotificationsComponent.POS_KEY).then((saved) => {
      if (saved && typeof saved.x === 'number' && typeof saved.y === 'number') {
        this.position = saved;
        this.initialized = true;
      }
    });
    this.sub = this.service.notifications$.subscribe((list) => {
      this.notifications = list;
      if (list.length && !this.initialized) {
        // Let the DOM paint, then land in the bottom-right corner.
        setTimeout(() => this.defaultPosition(), 0);
        this.initialized = true;
      }
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private defaultPosition(): void {
    const el = this.dockEl?.nativeElement;
    const w = el?.offsetWidth || 320;
    const h = el?.offsetHeight || 120;
    this.position.x = Math.max(8, window.innerWidth - w - 16);
    this.position.y = Math.max(8, window.innerHeight - h - 16);
    void this.persistPosition();
  }

  private persistPosition(): void {
    void this.storage.set(InAppNotificationsComponent.POS_KEY, this.position);
  }

  onDragStart(e: PointerEvent): void {
    // Close buttons must stay tappable, not become drag handles.
    if ((e.target as HTMLElement).closest('ion-button')) return;
    this.drag = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      originX: this.position.x,
      originY: this.position.y,
    };
    try {
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    } catch { /* best effort */ }
    e.preventDefault();
  }

  onDragMove(e: PointerEvent): void {
    if (!this.drag.active) return;
    const el = this.dockEl?.nativeElement;
    const maxX = Math.max(0, window.innerWidth - (el?.offsetWidth || 320));
    const maxY = Math.max(0, window.innerHeight - (el?.offsetHeight || 120));
    this.position.x = Math.min(Math.max(0, this.drag.originX + (e.clientX - this.drag.startX)), maxX);
    this.position.y = Math.min(Math.max(0, this.drag.originY + (e.clientY - this.drag.startY)), maxY);
  }

  onDragEnd(e: PointerEvent): void {
    if (!this.drag.active) return;
    this.drag.active = false;
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch { /* best effort */ }
    void this.persistPosition();
  }

  dismiss(n: InAppNotification): void {
    this.service.dismiss(n.id);
  }
}
