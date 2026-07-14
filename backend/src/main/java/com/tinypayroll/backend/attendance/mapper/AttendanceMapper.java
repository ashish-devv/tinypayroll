package com.tinypayroll.backend.attendance.mapper;

import com.tinypayroll.backend.attendance.AttendanceRecord;
import com.tinypayroll.backend.attendance.dto.AttendanceResponse;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface AttendanceMapper {

    AttendanceResponse toResponse(AttendanceRecord record);
}
