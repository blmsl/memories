import { Component, ViewChild, ElementRef } from '@angular/core';
import { SafeStyle } from '@angular/platform-browser';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MdDialog } from '@angular/material';
import { Observable } from 'rxjs/Rx';
import uuid from 'uuid/v4';

import {
  FormUtils,
  FileService,
  SafeUrlPipe,
} from '../../../shared';
import { StoryDetailEditComponent } from '../story-detail-edit.component';
import { StoryDetailGalleryComponent } from './story-detail-gallery.component';
import { MediaType } from './media-type';

@Component({
  selector: 'app-story-detail-photo',
  templateUrl: 'story-detail-photo.component.html',
  styleUrls: ['story-detail-photo.component.scss'],
})
export class StoryDetailPhotoComponent extends StoryDetailEditComponent {
  @ViewChild('addPhotoInput') addPhotoInput: ElementRef;

  // New photos that haven't been saved yet.
  newPhotos: { file: File, safeStyle: SafeStyle}[] = [];

  // Photos marked to be deleted (which won't be deleted until the editing is over).
  pendingDelete: { url: string, title?: string }[] = [];

  videoForm: FormGroup;

  // New videos.
  // If the variable remains as undefined, no modifications will be done. Otherwise, the final Story
  // object will have its videos replaced by this one when the update is over.
  newVideos: {
    [uid: string]: { id: string, type: string };
  };

  constructor(
    private formBuilder: FormBuilder,
    private dialog: MdDialog,
    private imageService: FileService,
    private safeUrlPipe: SafeUrlPipe,
  ) {
    super();

    this.videoForm = this.formBuilder.group({
      url: [''],
    });
  }

  addPhoto(event: EventTarget) {
    this.setPending();
    const filesList: FileList = FormUtils.getFilesFromEvent(event);
    const files: File[] = Array.from(filesList);
    if (files.length === 0) {
      return;
    }

    const to64 = files.map(file => FormUtils.base64FromImageFile(file));
    Observable.forkJoin(to64).subscribe((b64s: string[]) => {
      b64s.forEach((b64, i) => {
        const safeUrl: SafeStyle = this.safeUrlPipe.transform(b64);
        this.newPhotos.push({
          file: files[i],
          safeStyle: safeUrl,
        });
      });
    });
  }

  executeAddPhoto() {
    this.addPhotoInput.nativeElement.click();
  }

  initializeNewVideos() {
    if (this.newVideos !== undefined) {
      throw new Error('newVideos has already been initialized');
    }
    this.newVideos = {};
  }

  submitVideoForm() {
    this.setPending();
    const url: string = this.videoForm.value['url'];

    if (this.newVideos === undefined) {
      this.initializeNewVideos();
    }
    this.newVideos[uuid()] = { id: url, type: 'youtube' };
  }

  cleanup(): void {
    this.newPhotos = [];
    this.pendingDelete = [];
    this.videoForm.patchValue({ url: '' });
    this.newVideos = {};
    this.unsetPending();
  }

  updateStory(): Observable<void> {
    // Add videos to the story object. Contrary to photos, we only save their id.
    if (this.newVideos !== undefined) {
      this.story.videos = this.newVideos;
    }

    if (!this.story.photos) {
      this.story.photos = {};
    }

    // Delete "pendingDelete" photos.
    // TODO delete photo from storage.
    this.pendingDelete.forEach((pendingDeletePhoto) => {
      const photoId = Object.keys(this.story.photos).filter(id => this.story.photos[id] === pendingDeletePhoto)[0];
      delete this.story.photos[photoId];
    });

    // Create new photos.
    const createImages = this.newPhotos.map(photo => this.imageService.createImage(photo.file));
    const emptyObs = Observable.of(null); // To prevent waiting indefinetely just because there are
                                          // no new images to create.
    return Observable.forkJoin(...createImages, emptyObs).map((images: firebase.storage.UploadTaskSnapshot[]) => {
      images.splice(images.length - 1, 1); // Remove the emptyObs.
      images.forEach((image) => {
        const url = image.downloadURL;
        this.story.photos[this.findEmptyPhotoIndex()] = { url };
      });
      this.unsetPending();
    });
  }

  /**
   * There's a limit of 10 photos per story, find an empty index number from 0-9.
   * TODO.
   */
  findEmptyPhotoIndex() {
    return Object.keys(this.story.photos).length;
  }

  /**
   * Story photos that are NOT pending deletion.
   * This method should be used to display to current stored photos.
   */
  storyPhotos(): { url: string, title?: string }[] {
    if (!this.story.photos) {
      return [];
    }
    return Object.keys(this.story.photos)
      .map(key => this.story.photos[key])
      .filter(photo => !this.pendingDelete.includes(photo));
  }

  storyVideos(): { id: string, type: string }[] {
    if (this.newVideos !== undefined) {
      return Object.keys(this.newVideos).map(key => this.newVideos[key]);
    }
    if (this.story.videos) {
      return Object.keys(this.story.videos).map(key => this.story.videos[key]);
    }
    return [];
  }

  /**
   * Delete a photo that has been previously stored.
   * TODO.
   */
  deleteStoryPhoto(photo: { url: string, title?: string }) {
    this.setPending();
    this.pendingDelete = this.pendingDelete.concat(photo);
  }

  /**
   * Delete a new photo that hasn't been stored.
   */
  deleteNewStoryPhoto(photo) {
    this.newPhotos = this.newPhotos.filter(newPhoto => newPhoto !== photo);
  }

  deleteVideo(video: { id: string, type: string }) {

  }

  openGallery() {
    if (this.isEditing()) {
      return;
    }
    const media = Object.keys(this.story.photos).map(key => ({
      url: this.story.photos[key].url,
      type: MediaType.Photo,
    }));
    this.dialog.open(StoryDetailGalleryComponent, {
      data: {
        media,
        selectedIndex: 0,
      },
    });
  }
}
