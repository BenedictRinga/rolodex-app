import { Component, Input, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import Hammer from 'hammerjs';

@Component({
  selector: 'app-image-viewer',
  templateUrl: './image-viewer.component.html',
  styleUrls: ['./image-viewer.component.scss'],
})
export class ImageViewerComponent implements OnInit, AfterViewInit {

  @Input() imageUrl!: string;
  @ViewChild('image', { static: true }) image!: ElementRef<HTMLImageElement>;

  private scale: number = 1;
  private lastScale: number = 1;
  private panX: number = 0;
  private panY: number = 0;
  private lastPanX: number = 0;
  private lastPanY: number = 0;
  private hammer: any;

  constructor(private modalCtrl: ModalController) { }

  ngOnInit() { }

  ngAfterViewInit() {
    if (this.image?.nativeElement) {
      this.hammer = new Hammer(this.image.nativeElement);
      this.hammer.get('pinch').set({ enable: true });
      this.hammer.get('pan').set({ direction: Hammer.DIRECTION_ALL });
      this.hammer.on('pinch', (event: any) => this.onPinch(event));
      this.hammer.on('pan', (event: any) => this.onPan(event));
      this.hammer.on('pinchend', () => (this.lastScale = this.scale));
      this.hammer.on('panend', () => {
        this.lastPanX = this.panX;
        this.lastPanY = this.panY;
      });
    }
  }

  onPinch(event: any) {
    this.scale = Math.max(1, Math.min(this.lastScale * event.scale, 4));
    this.updateTransform();
  }

  onPan(event: any) {
    this.panX = this.lastPanX + event.deltaX;
    this.panY = this.lastPanY + event.deltaY;
    this.updateTransform();
  }

  updateTransform() {
    this.image.nativeElement.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.scale})`;
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }
}
