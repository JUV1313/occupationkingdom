(function () {
  "use strict";

  const { clamp } = window.ECO.util;

  function NPC(opts) {
    this.id = opts.id;
    this.name = opts.name;
    this.mesh = opts.mesh;
    this.home = opts.home || this.mesh.position.clone();

    this.state = "idle"; // idle | wander | approach | talk
    this.idleT = 0;
    this.wanderT = 0;

    this.target = this.home.clone();
    this.speed = opts.speed || 0.6;

    this.approachRadius = opts.approachRadius || 8.0;
    this.talkRadius = opts.talkRadius || 2.4;

    this._tmp = new BABYLON.Vector3(0, 0, 0);
  }

  NPC.prototype.update = function (dt, playerPos, playerScore) {
    const sScore = (playerScore && playerScore.S) || 0;

    const dist = BABYLON.Vector3.Distance(this.mesh.position, playerPos);

    if (this.state !== "talk" && dist < this.approachRadius && sScore >= 2) {
      this.state = "approach";
    }

    if (this.state === "idle") {
      this.idleT -= dt;
      if (this.idleT <= 0) {
        this.state = "wander";
        this.wanderT = 1.5 + Math.random() * 2.5;
        this._pickNewTarget();
      }
      return;
    }

    if (this.state === "wander") {
      this.wanderT -= dt;
      this._moveToward(this.target, dt);
      if (BABYLON.Vector3.Distance(this.mesh.position, this.target) < 0.6 || this.wanderT <= 0) {
        this.state = "idle";
        this.idleT = 1.0 + Math.random() * 2.5;
      }
      return;
    }

    if (this.state === "approach") {
      // להתקרב לשחקן
      this._moveToward(playerPos, dt);

      // להסתכל עליו
      this.mesh.lookAt(new BABYLON.Vector3(playerPos.x, this.mesh.position.y, playerPos.z));

      if (dist < this.talkRadius) {
        // נשאר approach, המשחק ינהל talk
      }
      if (dist > this.approachRadius + 4.0) {
        this.state = "wander";
        this._pickNewTarget();
      }
      return;
    }
  };

  NPC.prototype._pickNewTarget = function () {
    const r = 6;
    this.target.x = this.home.x + (Math.random() * 2 - 1) * r;
    this.target.z = this.home.z + (Math.random() * 2 - 1) * r;
    this.target.y = this.home.y;
  };

  NPC.prototype._moveToward = function (toPos, dt) {
    const pos = this.mesh.position;
    this._tmp.copyFrom(toPos).subtractInPlace(pos);
    this._tmp.y = 0;
    const len = this._tmp.length();
    if (len < 0.0001) return;

    this._tmp.scaleInPlace(1 / len);
    const step = clamp(this.speed * dt, 0, 0.25);
    pos.addInPlace(this._tmp.scale(step));
  };

  window.ECO = window.ECO || {};
  window.ECO.NPC = NPC;
})();
