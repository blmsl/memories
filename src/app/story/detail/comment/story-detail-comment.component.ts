import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { ReplaySubject } from 'rxjs/Rx';

import {
  User,
  UserService,
  Story,
  Comment,
  CommentService,
} from '../../../shared';

@Component({
  selector: 'app-story-detail-comment',
  templateUrl: 'story-detail-comment.component.html',
  styleUrls: ['story-detail-comment.component.scss'],
})
export class StoryDetailCommentComponent implements OnInit, OnDestroy {
  destroy: ReplaySubject<any> = new ReplaySubject();

  @Input() story: Story;

  comments: Comment[];
  users: { [id: string]: User } = {}; // Serves as a cache. So that repeated users aren't fetched
                                      // several times (if they have published more than a comment).

  constructor(
    private commentService: CommentService,
    private userService: UserService,
  ) { }

  ngOnInit() {
    this.commentService.readComments(this.story.$key)
      .takeUntil(this.destroy)
      .subscribe((comments: Comment[]) => {
        this.comments = comments.sort((a, b) => (b.updatedAt as number) - (a.updatedAt as number));

        // Gather user data associated with these comments.
        comments.forEach(comment => this.refreshUser(comment.owner));
      });
  }

  ngOnDestroy() {
    this.destroy.next(true);
  }

  refreshUser(userId: string) {
    if (this.users[userId]) {
      return;
    }
    this.users[userId] = new User({}); // Async is going to take a while until it assigns the real values.
    this.userService.readUser(userId).first().subscribe((user: User) => {
      this.users[userId] = user;
    });
  }
}
