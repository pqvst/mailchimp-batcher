const _ = require("lodash");
const fs = require("fs");
const mailchimp = require("mailchimp-v3");
const async = require("async");
const gets = require("getstring");

const MEMBERS_COUNT = 2000;

let lists, list, segments, members, batched_members, batch_size;

async.waterfall([

  function (done) {
    console.log();
    gets("Mailchimp API key:", answer => {
      mailchimp.setApiKey(answer);
      done();
    });
  },

  function (done) {
    console.log("");
    console.log("Fetching lists...");

    mailchimp
      .get("lists")
      .then(result => {
        lists = result.lists;
        console.log("");
        console.log("Lists");
        console.log("-----");
        _.each(lists, (list, i) => {
          console.log([i, list.id, list.name].join("  "));
        });
        done();
      })
      .catch(err => {
        done(err);
      });
  },

  function (done) {
    console.log("");
    gets("Select a list:", answer => {
      list = lists[Number(answer)];
      done();
    });
  },

  function (done) {
    console.log("");
    console.log("Fetching segments...");

    mailchimp
      .get(`lists/${list.id}/segments?type=static`)
      .then(result => {
        segments = result.segments;
        console.log("");
        console.log("Segments");
        console.log("--------");
        _.each(segments, (segment, i) => {
          console.log([i, segment.id, segment.name].join("  "));
        });
        done();
      })
      .catch(err => {
        done(err);
      });
  },

  function (done) {
    console.log("");
    console.log("Fetching segments members...");

    async.concat(segments, (segment, done) => {
      mailchimp
        .get(`lists/${list.id}/segments/${segment.id}/members?count=${MEMBERS_COUNT}`)
        .then(result => {
          const members = _.map(result.members, "email_address");
          done(null, members);
        })
        .catch(err => {
          done(err);
        });
    }, (err, concated) => {
      batched_members = concated;
      done(err);
    });
  },

  function (done) {
    console.log("");
    console.log(`Found ${batched_members.length} batched member(s) across ${segments.length} segment(s)`);
    done();
  },

  function (done) {
    console.log("");
    console.log("Fetching list members...");

    mailchimp
      .get(`lists/${list.id}/members?count=${MEMBERS_COUNT}`)
      .then(result => {
        members = _.map(result.members, "email_address");
        console.log("");
        console.log(`Found ${members.length} member(s) in list: ${list.name}`);
        done();
      })
      .catch(err => {
        console.log(err);
      });
  },

  function (done) {
    console.log("");
    gets("New batch size:", answer => {
      batch_size = Number(answer);
      done();
    });
  },

  function (done) {
    const batch = _(members)
      .difference(batched_members)
      .shuffle()
      .take(batch_size)
      .value();

    const file = batch.join("\n");
    fs.writeFileSync("batch.txt", file);

    console.log("");
    console.log("Batch written to batch.txt");
    done();
  }

], err => {
  if (err) console.log(err);
  process.exit();
});
