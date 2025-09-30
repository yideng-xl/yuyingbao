        mockMvc.perform(post("/auth/wechat/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(loginRequest)))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token", notNullValue()))
                .andReturn();

        // 解析token
        String responseBody = loginResult.getResponse().getContentAsString();
        Map<String, Object> response = fromJson(responseBody, Map.class);
        String userToken = (String) ((Map<String, Object>) response.get("data")).get("token");
        String tokenType = (String) ((Map<String, Object>) response.get("data")).get("tokenType");
        String fullToken = tokenType + " " + userToken;

        // ============ 2. 创建家庭 ============
        CreateFamilyRequest familyRequest = new CreateFamilyRequest();
        familyRequest.setName("端到端测试家庭");

        MvcResult familyResult = mockMvc.perform(post("/families")
                        .header("Authorization", fullToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(familyRequest)))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name", is("端到端测试家庭")))
                .andExpect(jsonPath("$.inviteCode", notNullValue()))
                .andReturn();

        String familyResponseBody = familyResult.getResponse().getContentAsString();
        Map<String, Object> familyResponse = fromJson(familyResponseBody, Map.class);
        Long familyId = Long.valueOf(((Map<String, Object>) familyResponse.get("data")).get("id").toString());

        // ============ 3. 邀请另一个用户加入家庭 ============
        // 先获取邀请码
        String inviteCode = (String) ((Map<String, Object>) familyResponse.get("data")).get("inviteCode");

        // 用户B登录
        WeChatLoginRequest userBLoginRequest = new WeChatLoginRequest();
        userBLoginRequest.setCode("e2e_user_b");
        userBLoginRequest.setNickname("用户B");

        MvcResult userBLoginResult = mockMvc.perform(post("/auth/wechat/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(userBLoginRequest)))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token", notNullValue()))
                .andReturn();

        String userBResponseBody = userBLoginResult.getResponse().getContentAsString();
        Map<String, Object> userBResponse = fromJson(userBResponseBody, Map.class);
        String userBToken = (String) ((Map<String, Object>) userBResponse.get("data")).get("token");
        String userBTokenType = (String) ((Map<String, Object>) userBResponse.get("data")).get("tokenType");
        String fullUserBToken = userBTokenType + " " + userBToken;

        // 用户B加入家庭
        JoinFamilyRequest joinRequest = new JoinFamilyRequest();
        joinRequest.setInviteCode(inviteCode);

        mockMvc.perform(post("/families/join")
                        .header("Authorization", fullUserBToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(joinRequest)))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name", is("端到端测试家庭")));

        // ============ 4. 创建宝宝信息 ============
        UpsertBabyRequest babyRequest = new UpsertBabyRequest();
        babyRequest.setName("测试宝宝");
        babyRequest.setGender(Gender.BOY);
        babyRequest.setBirthDate(LocalDate.of(2024, 1, 1));
        babyRequest.setAvatarUrl("http://test.com/baby-avatar.jpg");
        babyRequest.setBirthHeightCm(50.0);
        babyRequest.setBirthWeightKg(3.2);

        MvcResult babyResult = mockMvc.perform(post("/families/{familyId}/babies", familyId)
                        .header("Authorization", fullToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(babyRequest)))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name", is("测试宝宝")))
                .andExpect(jsonPath("$.gender", is("BOY")))
                .andReturn();

        String babyResponseBody = babyResult.getResponse().getContentAsString();
        Map<String, Object> babyResponse = fromJson(babyResponseBody, Map.class);
        Long babyId = Long.valueOf(((Map<String, Object>) babyResponse.get("data")).get("id").toString());

        // ============ 5. 创建各种类型的记录 ============
        // 5.1 创建母乳亲喂记录
        CreateRecordRequest breastfeedingRecord = new CreateRecordRequest();
        breastfeedingRecord.setBabyId(babyId);
        breastfeedingRecord.setType(RecordType.BREASTFEEDING);
        breastfeedingRecord.setHappenedAt(OffsetDateTime.now().minusHours(3));
        breastfeedingRecord.setDurationMin(15);
        breastfeedingRecord.setBreastfeedingSide("LEFT");

        mockMvc.perform(post("/families/{familyId}/records", familyId)
                        .header("Authorization", fullToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(breastfeedingRecord)))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.type", is("BREASTFEEDING")));

        // 5.2 创建大便记录
        CreateRecordRequest diaperRecord = new CreateRecordRequest();
        diaperRecord.setBabyId(babyId);
        diaperRecord.setType(RecordType.DIAPER);
        diaperRecord.setHappenedAt(OffsetDateTime.now().minusHours(2));
        diaperRecord.setDiaperTexture(DiaperTexture.NORMAL);
        diaperRecord.setDiaperColor(DiaperColor.YELLOW);
        diaperRecord.setHasUrine(true);
        diaperRecord.setNote("正常大便");

        mockMvc.perform(post("/families/{familyId}/records", familyId)
                        .header("Authorization", fullToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(diaperRecord)))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.type", is("DIAPER")));

        // 5.3 按时间筛选 - 查询最近1小时的记录
        OffsetDateTime oneHourAgo = OffsetDateTime.now().minusHours(1);
        OffsetDateTime now = OffsetDateTime.now().plusMinutes(5);

        mockMvc.perform(get("/families/{familyId}/records/filter", familyId)
                        .param("start", oneHourAgo.toString())
                        .param("end", now.toString())
                        .header("Authorization", fullToken))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2))); // 应该有大便记录和成长记录

        // ============ 6. 更新记录 ============
        
        // 获取第一条记录用于更新测试
        MvcResult recordsResult = mockMvc.perform(get("/families/{familyId}/records", familyId)
                        .header("Authorization", fullToken))
                .andExpect(status().isOk())
                .andReturn();

        String recordsResponseBody = recordsResult.getResponse().getContentAsString();
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> records = fromJson(recordsResponseBody, List.class);
        assertFalse(records.isEmpty());
        
        Long recordId = Long.valueOf(records.get(0).get("id").toString());

        // 更新记录
        UpdateRecordRequest updateRequest = new UpdateRecordRequest();
        updateRequest.setType(RecordType.BREASTFEEDING);
        updateRequest.setHappenedAt(OffsetDateTime.now());
        updateRequest.setDurationMin(20); // 更新时长
        updateRequest.setBreastfeedingSide("RIGHT"); // 更新乳房

        mockMvc.perform(put("/families/{familyId}/records/{recordId}", familyId, recordId)
                        .header("Authorization", fullToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(updateRequest)))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.durationMin", is(20)))
                .andExpect(jsonPath("$.breastfeedingSide", is("RIGHT")));

        // ============ 7. 查询家庭成员 ============
        mockMvc.perform(get("/families/{familyId}/members", familyId)
                        .header("Authorization", fullToken))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].role", is("CREATOR")));

        // ============ 8. 查询宝宝列表 ============
        mockMvc.perform(get("/families/{familyId}/babies", familyId)
                        .header("Authorization", fullToken))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].name", is("测试宝宝")));

        // ============ 9. 创建成长记录 ============
        CreateRecordRequest growthRecord = new CreateRecordRequest();
        growthRecord.setBabyId(babyId);
        growthRecord.setType(RecordType.GROWTH);
        growthRecord.setHappenedAt(OffsetDateTime.now().minusHours(1));
        growthRecord.setHeightCm(55.0);
        growthRecord.setWeightKg(4.0);
        growthRecord.setNote("满月体检");

        mockMvc.perform(post("/families/{familyId}/records", familyId)
                        .header("Authorization", fullToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(growthRecord)))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.type", is("GROWTH")))
                .andExpect(jsonPath("$.heightCm", is(55.0)))
                .andExpect(jsonPath("$.weightKg", is(4.0)));

        // ============ 10. 用户B也能看到所有记录 ============
        mockMvc.perform(get("/families/{familyId}/records", familyId)
                        .header("Authorization", fullUserBToken))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(4))); // 应该有4条记录

        // ============ 11. 删除记录 ============
        mockMvc.perform(delete("/families/{familyId}/records/{recordId}", familyId, recordId)
                        .header("Authorization", fullToken))
                .andDo(print())
                .andExpect(status().isNoContent());

        // 验证记录已被删除
        mockMvc.perform(get("/families/{familyId}/records", familyId)
                        .header("Authorization", fullToken))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(3))); // 应该剩下3条记录

        // ============ 12. 用户退出家庭 ============
        mockMvc.perform(delete("/families/{familyId}/members/self", familyId)
                        .header("Authorization", fullUserBToken))
                .andDo(print())
                .andExpect(status().isNoContent());

        // 验证用户已退出
        mockMvc.perform(get("/families/my", familyId)
                        .header("Authorization", fullUserBToken))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", nullValue())); // 用户不再有家庭

        // ============ 13. 验证剩余数据 ============
        List<Family> families = familyRepository.findAll();
        assertTrue(families.stream().anyMatch(f -> f.getName().equals("端到端测试家庭")));

        List<Record> remainingRecords = recordRepository.findByFamilyId(familyId);
        assertEquals(3, remainingRecords.size());
        
        // 验证记录类型分布
        long bottleRecords = remainingRecords.stream().filter(r -> r.getType() == RecordType.BREASTFEEDING).count();
        long diaperRecords = remainingRecords.stream().filter(r -> r.getType() == RecordType.DIAPER).count();
        long growthRecords = remainingRecords.stream().filter(r -> r.getType() == RecordType.GROWTH).count();
        
        assertEquals(1, bottleRecords);
        assertEquals(1, diaperRecords);
        assertEquals(1, growthRecords);
    }

    @Test
    @DisplayName("多用户家庭协作测试")
    void testMultiUserFamilyCollaboration() throws Exception {
        // ============ 1. 用户A创建家庭 ============
        WeChatLoginRequest userALoginRequest = new WeChatLoginRequest();
        userALoginRequest.setCode("e2e_user_a");
        userALoginRequest.setNickname("用户A");

        MvcResult userALoginResult = mockMvc.perform(post("/auth/wechat/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(userALoginRequest)))
                .andExpect(status().isOk())
                .andReturn();

        String userAResponseBody = userALoginResult.getResponse().getContentAsString();
        Map<String, Object> userAResponse = fromJson(userAResponseBody, Map.class);
        String userAToken = (String) ((Map<String, Object>) userAResponse.get("data")).get("token");
        String userATokenType = (String) ((Map<String, Object>) userAResponse.get("data")).get("tokenType");
        String fullUserAToken = userATokenType + " " + userAToken;

        // 创建家庭
        CreateFamilyRequest familyRequest = new CreateFamilyRequest();
        familyRequest.setName("协作测试家庭");

        MvcResult familyResult = mockMvc.perform(post("/families")
                        .header("Authorization", fullUserAToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(familyRequest)))
                .andExpect(status().isOk())
                .andReturn();

        String familyResponseBody = familyResult.getResponse().getContentAsString();
        Map<String, Object> familyResponse = fromJson(familyResponseBody, Map.class);
        Long familyId = Long.valueOf(((Map<String, Object>) familyResponse.get("data")).get("id").toString());
        String inviteCode = (String) ((Map<String, Object>) familyResponse.get("data")).get("inviteCode");

        // ============ 2. 用户B和用户C加入家庭 ============
        // 用户B登录并加入
        WeChatLoginRequest userBLoginRequest = new WeChatLoginRequest();
        userBLoginRequest.setCode("e2e_user_b");
        userBLoginRequest.setNickname("用户B");

        MvcResult userBLoginResult = mockMvc.perform(post("/auth/wechat/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(userBLoginRequest)))
                .andExpect(status().isOk())
                .andReturn();

        String userBResponseBody = userBLoginResult.getResponse().getContentAsString();
        Map<String, Object> userBResponse = fromJson(userBResponseBody, Map.class);
        String userBToken = (String) ((Map<String, Object>) userBResponse.get("data")).get("token");
        String userBTokenType = (String) ((Map<String, Object>) userBResponse.get("data")).get("tokenType");
        String fullUserBToken = userBTokenType + " " + userBToken;

        JoinFamilyRequest joinBRequest = new JoinFamilyRequest();
        joinBRequest.setInviteCode(inviteCode);

        mockMvc.perform(post("/families/join")
                        .header("Authorization", fullUserBToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(joinBRequest)))
                .andExpect(status().isOk());

        // 用户C登录并加入
        WeChatLoginRequest userCLoginRequest = new WeChatLoginRequest();
        userCLoginRequest.setCode("e2e_user_c");
        userCLoginRequest.setNickname("用户C");

        MvcResult userCLoginResult = mockMvc.perform(post("/auth/wechat/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(userCLoginRequest)))
                .andExpect(status().isOk())
                .andReturn();

        String userCResponseBody = userCLoginResult.getResponse().getContentAsString();
        Map<String, Object> userCResponse = fromJson(userCResponseBody, Map.class);
        String userCToken = (String) ((Map<String, Object>) userCResponse.get("data")).get("token");
        String userCTokenType = (String) ((Map<String, Object>) userCResponse.get("data")).get("tokenType");
        String fullUserCToken = userCTokenType + " " + userCToken;

        JoinFamilyRequest joinCRequest = new JoinFamilyRequest();
        joinCRequest.setInviteCode(inviteCode);

        mockMvc.perform(post("/families/join")
                        .header("Authorization", fullUserCToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(joinCRequest)))
                .andExpect(status().isOk());

        // ============ 3. 创建宝宝 ============
        UpsertBabyRequest babyRequest = new UpsertBabyRequest();
        babyRequest.setName("协作宝宝");
        babyRequest.setGender(Gender.GIRL);
        babyRequest.setBirthDate(LocalDate.of(2024, 2, 1));

        MvcResult babyResult = mockMvc.perform(post("/families/{familyId}/babies", familyId)
                        .header("Authorization", fullUserAToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(babyRequest)))
                .andExpect(status().isOk())
                .andReturn();

        String babyResponseBody = babyResult.getResponse().getContentAsString();
        Map<String, Object> babyResponse = fromJson(babyResponseBody, Map.class);
        Long babyId = Long.valueOf(((Map<String, Object>) babyResponse.get("data")).get("id").toString());

        // ============ 4. 三个用户协作创建记录 ============
        // 用户A创建记录
        CreateRecordRequest userARecord = new CreateRecordRequest();
        userARecord.setBabyId(babyId);
        userARecord.setType(RecordType.BREASTFEEDING);
        userARecord.setHappenedAt(OffsetDateTime.now());
        userARecord.setDurationMin(15);
        userARecord.setBreastfeedingSide("BOTH");

        mockMvc.perform(post("/families/{familyId}/records", familyId)
                        .header("Authorization", fullUserAToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(userARecord)))
                .andExpect(status().isOk());

        // 用户B创建记录
        CreateRecordRequest userBRecord = new CreateRecordRequest();
        userBRecord.setBabyId(babyId);
        userBRecord.setType(RecordType.BOTTLE);
        userBRecord.setHappenedAt(OffsetDateTime.now());
        userBRecord.setAmountMl(150.0);

        mockMvc.perform(post("/families/{familyId}/records", familyId)
                        .header("Authorization", fullUserBToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(userBRecord)))
                .andExpect(status().isOk());

        // ============ 5. 两个用户都能查看所有记录 ============
        
        // 用户A查看记录
        mockMvc.perform(get("/families/{familyId}/records", familyId)
                        .header("Authorization", fullUserAToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)));

        // 用户B也能查看相同的记录
        mockMvc.perform(get("/families/{familyId}/records", familyId)
                        .header("Authorization", fullUserBToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)));

        // ============ 6. 验证家庭成员列表 ============
        mockMvc.perform(get("/families/{familyId}/members", familyId)
                        .header("Authorization", fullUserAToken))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(3))) // 三个用户
                .andExpect(jsonPath("$[0].user.nickname", anyOf(is("用户A"), is("用户B"), is("用户C"))));

        // ============ 7. 验证家庭信息 ============
        mockMvc.perform(get("/families/my")
                        .header("Authorization", fullUserAToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.name", is("协作测试家庭")));

        mockMvc.perform(get("/families/my")
                        .header("Authorization", fullUserBToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.name", is("协作测试家庭")));

        mockMvc.perform(get("/families/my")
                        .header("Authorization", fullUserCToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.name", is("协作测试家庭")));

        // ============ 8. 验证宝宝信息 ============
        mockMvc.perform(get("/families/{familyId}/babies", familyId)
                        .header("Authorization", fullUserAToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].name", is("协作宝宝")));

        // ============ 9. 验证权限控制 ============
        // 非家庭成员不能访问
        WeChatLoginRequest userDLoginRequest = new WeChatLoginRequest();
        userDLoginRequest.setCode("e2e_user_d");
        userDLoginRequest.setNickname("用户D");

        MvcResult userDLoginResult = mockMvc.perform(post("/auth/wechat/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(userDLoginRequest)))
                .andExpect(status().isOk())
                .andReturn();

        String userDResponseBody = userDLoginResult.getResponse().getContentAsString();
        Map<String, Object> userDResponse = fromJson(userDResponseBody, Map.class);
        String userDToken = (String) ((Map<String, Object>) userDResponse.get("data")).get("token");
        String userDTokenType = (String) ((Map<String, Object>) userDResponse.get("data")).get("tokenType");
        String fullUserDToken = userDTokenType + " " + userDToken;

        mockMvc.perform(get("/families/{familyId}/records", familyId)
                        .header("Authorization", fullUserDToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/families/{familyId}/records", familyId)
                        .header("Authorization", fullUserDToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(userARecord)))
                .andExpect(status().isForbidden());

        // ============ 10. 验证数据完整性 ============
        List<Record> allRecords = recordRepository.findByFamilyId(familyId);
        assertEquals(2, allRecords.size());
        
        long breastfeedingRecords = allRecords.stream().filter(r -> r.getType() == RecordType.BREASTFEEDING).count();
        long bottleRecords = allRecords.stream().filter(r -> r.getType() == RecordType.BOTTLE).count();
        
        assertEquals(1, breastfeedingRecords);
        assertEquals(1, bottleRecords);
    }
}