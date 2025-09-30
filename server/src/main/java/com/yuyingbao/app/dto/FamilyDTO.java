package com.yuyingbao.app.dto;

import com.yuyingbao.app.model.entity.Family;
import com.yuyingbao.app.model.entity.FamilyMember;
import com.yuyingbao.app.model.entity.User;
import com.yuyingbao.app.service.UserService;
import lombok.Data;

import java.util.List;
import java.util.stream.Collectors;

@Data
public class FamilyDTO {
    private Long id;
    private String name;
    private String inviteCode;
    private Long creatorUserId;
    private String createdAt;
    private List<FamilyMemberDTO> members;
    private User creator;

    public static FamilyDTO fromEntity(Family family, List<FamilyMember> members, User creator, UserService userService) {
        FamilyDTO dto = new FamilyDTO();
        dto.setId(family.getId());
        dto.setName(family.getName());
        dto.setInviteCode(family.getInviteCode());
        dto.setCreatorUserId(family.getCreatorUserId());
        dto.setCreatedAt(family.getCreatedAt().toString());
        
        // 转换成员列表，包含用户信息
        if (members != null) {
            dto.setMembers(members.stream()
                    .map(member -> {
                        User user = userService.getUserById(member.getUserId());
                        return FamilyMemberDTO.fromEntity(member, user);
                    })
                    .collect(Collectors.toList()));
        }
        
        dto.setCreator(creator);
        return dto;
    }
}