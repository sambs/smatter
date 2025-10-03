import { Subject } from "rxjs";

type Setter<T> = (v: T) => void;

type Emitter<T> = {
  on: (handler: (v: T) => void) => void;
  off: (handler: (v: T) => void) => void;
};

export class InterceptingSubject<T> extends Subject<T> {
  private emitter: Emitter<T>;
  private setter: Setter<T>;

  constructor(emitter: Emitter<T>, setter: Setter<T>) {
    super();

    this.emitter = emitter;
    this.setter = setter;

    this.emitter.on((value) => super.next(value));
  }

  // override subscribe(...params: any[]) {
  //   console.log("subscribe");
  //   const subscription = super.subscribe(...params);
  //   this.emitter.on(super.next);
  //   return subscription;
  // }
  //
  // override unsubscribe() {
  //   console.log("unsubscribe");
  //   this.emitter.off(super.next);
  // }

  override next(value: T): void {
    console.log("next");
    this.setter(value);
  }
}
