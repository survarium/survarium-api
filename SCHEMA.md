# Combiners for native API (draft)

## Fetch

player(nickname)
  pidByNickname(nickname) -> { pid }
    getUserData(pid) -> { ammunition_ids, slots_ids }
      getUserAmmunition(ammunition_ids)
      getUserSlots(slots_ids)
    getUserClans(pid)
    getUserMatches(pid) -> { IDS }
      getMatchStatistic(IDS) -> { map_id }
        getMapInfo(map_id, language)

match(id)
  getMatchStatistic -> { map_id, PIDS }
    getMapInfo(map_id, language) -> { weather, map_name, mode }
    getNicknamesByPIDS(PIDS)
    getClansByPIDS(PIDS)
