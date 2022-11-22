export const browserDBInstance = (db) => {

    return {
      executeSql: (sql) => {
        return new Promise((resolve, reject) => {
          db.transaction((tx) => {
            tx.executeSql(sql, [], (tx, rs) => {
              resolve(rs)
            });
          });
        })
      }
    }
  }