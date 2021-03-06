/**
 * Runs the task and each of it's children's tasks.
 *
 * It first runs it's own element's exec() method if one exists; when it's
 * own Promise resolves it runs each of it's child elements' through
 * startTasks() in series, unless the property parallelTasks is set to true on
 * it's * component instance, in which case they will run in parallel.
 *
 * Introduces two new lifecycle methods componentWillExec() and
 * componentDidExec(). If componentWillExec() is defined it will be called
 * before it's own exec() method is called. If componentDidExec() is defined
 * it will be called after it's own exec() method has resolved and after
 * each of it's child elements' have been run through startTasks() methods have
 * resolved.
 *
 * It's important to note that the startTasks() method is an internal construct
 * while exec(), componentWillExec(), and componentDidExec() are part of the
 * React component representing the task. An inheritor will never need to
 * implement a startTasks() method, and if they do it will never be called by
 * the internals of React Pipeline.
 * @return Promise
 */
export default function startTasks() {
  const inst = this._instance;

  if (inst && inst.componentWillExec) {
    inst.componentWillExec();
  }

  const exec = inst && inst.exec ? inst::inst.exec : () => Promise.resolve();
  const forceUpdate = inst && inst.forceUpdate ? inst::inst.forceUpdate : (cb) => cb();

  return exec().then(() => {
    return new Promise((resolve, reject) => {
      forceUpdate(() => {
        const children = [];
        let renderedChildren = this._renderedChildren;

        if (this._renderedComponent) {
          if (this._renderedComponent._instance && this._renderedComponent._instance.exec) {
            children.push(this._renderedComponent);
          } else if (this._renderedComponent._renderedChildren) {
            renderedChildren = this._renderedComponent._renderedChildren;
          }
        }

        if (renderedChildren) {
          for (let key in renderedChildren) {
            const child = renderedChildren[key];
            children.push(child);
          }
        }

        if (children.length === 0) {
          if (inst && inst.componentDidExec) { inst.componentDidExec(); }
          return resolve();
        }

        if (inst && inst.props.parallelTasks === true) {
          Promise.all(children.map((c) => c::startTasks())).then(() => {
            if (inst && inst.componentDidExec) { inst.componentDidExec(); }
          }).then(resolve).catch(reject);
        } else {
          children.reduce((cur, next) => {
            return cur.then(next::startTasks);
          }, Promise.resolve()).then(() => {
            if (inst && inst.componentDidExec) { inst.componentDidExec(); }
          }).then(resolve).catch(reject);
        }
      });
    });
  });
}
