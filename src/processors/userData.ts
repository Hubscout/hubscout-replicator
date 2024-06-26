import { UserDataAddMessage } from "@farcaster/hub-nodejs";
import { DBTransaction, FnameRow, execute } from "../db.js";
import { farcasterTimeToDate } from "../util.js";

export const processUserDataAdd = async (
  message: UserDataAddMessage,
  trx: DBTransaction
) => {
  const now = new Date();
  const fid = message.data.fid;
  if (
    message.data.userDataBody.type === 1 ||
    message.data.userDataBody.type === 2 ||
    message.data.userDataBody.type === 3 ||
    message.data.userDataBody.type === 6
  ) {
    let key = "";
    switch (message.data.userDataBody.type) {
      case 1:
        key = "pfp";
        break;
      case 2:
        key = "display_name";
        break;
      case 3:
        key = "bio";
        break;
      case 6:
        key = "username";
    }
    try {
      try {
        await trx
          .updateTable("fnames")
          .where("fid", "=", fid)
          .set({ [key]: message.data.userDataBody.value })
          .execute();
      } catch (e) {
        console.log("error in inner", e);
      }
    } catch (e) {
      console.log("error in outer", e);
    }
  }

  await execute(
    trx
      .insertInto("userData")
      .values({
        timestamp: farcasterTimeToDate(message.data.timestamp),
        fid: message.data.fid,
        hash: message.hash,
        type: message.data.userDataBody.type,
        value: message.data.userDataBody.value,
      })
      .onConflict((oc) =>
        oc
          .columns(["fid", "type"])
          .doUpdateSet(({ ref }) => ({
            hash: ref("excluded.hash"),
            timestamp: ref("excluded.timestamp"),
            value: ref("excluded.value"),
            updatedAt: now,
          }))
          .where(({ or, eb, ref }) =>
            // Only update if a value has actually changed
            or([
              eb("excluded.hash", "!=", ref("userData.hash")),
              eb("excluded.timestamp", "!=", ref("userData.timestamp")),
              eb("excluded.value", "!=", ref("userData.value")),
              eb("excluded.updatedAt", "!=", ref("userData.updatedAt")),
            ])
          )
      )
  );
};
