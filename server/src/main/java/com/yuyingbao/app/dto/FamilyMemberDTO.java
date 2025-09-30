package com.yuyingbao.app.dto;

import com.yuyingbao.app.model.entity.FamilyMember;
import com.yuyingbao.app.model.entity.User;
import lombok.Data;

@Data
public class FamilyMemberDTO {
    private Long id;
    private Long familyId;
    private Long userId;
    private String role;
    private String memberRole;
    private String memberRoleDisplayName;
    private String joinedAt;
    private String nickName;
    private String avatarUrl;

    public static FamilyMemberDTO fromEntity(FamilyMember familyMember, User user) {
        FamilyMemberDTO dto = new FamilyMemberDTO();
        dto.setId(familyMember.getId());
        dto.setFamilyId(familyMember.getFamilyId());
        dto.setUserId(familyMember.getUserId());
        dto.setRole(familyMember.getRole());
        if (familyMember.getMemberRole() != null) {
            dto.setMemberRole(familyMember.getMemberRole().name());
            dto.setMemberRoleDisplayName(familyMember.getMemberRole().getDisplayName());
        } else {
            // 如果没有设置具体角色，根据角色类型设置默认显示名称
            if ("CREATOR".equals(familyMember.getRole())) {
                dto.setMemberRoleDisplayName("创建者");
            } else {
                dto.setMemberRoleDisplayName("成员");
            }
        }
        dto.setJoinedAt(familyMember.getJoinedAt().toString());
        // 添加用户信息
        if (user != null) {
            dto.setNickName(user.getNickname());
            dto.setAvatarUrl(user.getAvatarUrl());
        }
        return dto;
    }
}