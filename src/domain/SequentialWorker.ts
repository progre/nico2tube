import { Subject } from 'rxjs';

export default class SequentialWorker {
  private list: ReadonlyArray<{ label: string; work(): Promise<void>; }> = [];
  private working = false;

  error = new Subject<Error>();

  queue() {
    return this.list.map(x => x.label);
  }

  enqueue(label: string, work: () => Promise<void>) {
    if (this.list.every(x => x.label !== label)) {
      this.list = [...this.list, { label, work }];
    }
    this.beginWork().catch((e) => {
      this.error.next(e);
    });
  }

  ready() {
    this.beginWork().catch((e) => {
      this.error.next(e);
    });
  }

  private async beginWork() {
    if (this.working) {
      return;
    }
    if (this.list.length === 0) {
      return;
    }
    this.working = true;
    try {
      await this.workRecursive();
    } catch (e) {
      this.error.next(e);
    }
    this.working = false;
  }

  private async workRecursive(): Promise<void> {
    if (this.list.length === 0) {
      return;
    }
    const item = this.list[0];
    await item.work();
    if (item !== this.list[0]) { throw new Error('logic error'); }
    this.list = this.list.slice(1); // workが通ったら次にシフト
    return this.workRecursive();
  }
}
